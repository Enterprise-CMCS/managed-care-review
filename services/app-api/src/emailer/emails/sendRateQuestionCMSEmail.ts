import { formatCalendarDate } from '../../../../app-web/src/common-code/dateHelpers'
import { pruneDuplicateEmails } from '../formatters'
import type { EmailConfiguration, EmailData, StateAnalystsEmails } from '..'
import type { RateQuestionType, RateType } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    renderTemplate,
    getQuestionRound,
} from '../templateHelpers'
import { rateSummaryQuestionResponseURL } from '../generateURLs'

export const sendRateQuestionCMSEmail = async (
    rate: RateType,
    stateAnalystsEmails: StateAnalystsEmails,
    config: EmailConfiguration,
    questions: RateQuestionType[],
    currentQuestion: RateQuestionType
): Promise<EmailData | Error> => {
    const rateFormData = rate.packageSubmissions[0].rateRevision.formData
    const rateCertName = rateFormData.rateCertificationName

    if (!rateCertName) {
        return new Error(
            'Error getting rate certification name. Rate certification name was undefined.'
        )
    }

    let receiverEmails = [...stateAnalystsEmails, ...config.devReviewTeamEmails]

    if (currentQuestion.division === 'DMCP') {
        receiverEmails.push(...config.dmcpReviewEmails)
    } else if (currentQuestion.division === 'OACT') {
        receiverEmails.push(...config.oactEmails)
    }

    receiverEmails = pruneDuplicateEmails(receiverEmails)

    const questionResponseURL = rateSummaryQuestionResponseURL(
        rate.id,
        config.baseUrl
    )

    const questionRound = getQuestionRound(questions, currentQuestion)

    if (questionRound instanceof Error) {
        return questionRound
    }

    const data = {
        packageName: rateCertName,
        questionResponseURL,
        cmsRequestorEmail: currentQuestion.addedBy.email,
        cmsRequestorName: `${currentQuestion.addedBy.givenName} ${currentQuestion.addedBy.familyName}`,
        cmsRequestorDivision: currentQuestion.division,
        dateAsked: formatCalendarDate(
            currentQuestion.createdAt,
            'America/Los_Angeles'
        ),
        questionRound,
    }

    const result = await renderTemplate<typeof data>(
        'sendRateQuestionCMSEmail',
        data
    )

    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: receiverEmails,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }Questions sent for ${rateCertName}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
