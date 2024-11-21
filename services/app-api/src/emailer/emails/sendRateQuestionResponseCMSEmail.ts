import { formatCalendarDate } from '@mc-review/common-code'
import { pruneDuplicateEmails } from '../formatters'
import type { EmailConfiguration, EmailData } from '..'
import type { RateQuestionType, RateType } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    renderTemplate,
    getQuestionRound,
} from '../templateHelpers'
import { rateSummaryQuestionResponseURL } from '../generateURLs'
import type { StateAnalystsEmails } from '..'

export const sendRateQuestionResponseCMSEmail = async (
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

    // currentQuestion is the question the new response belongs to. Responses can be uploaded to any question round.
    const { responses, division } = currentQuestion
    const latestResponse = responses[0]
    const questionRound = getQuestionRound(questions, currentQuestion)

    if (questionRound instanceof Error) {
        return questionRound
    }

    let receiverEmails = [...stateAnalystsEmails, ...config.devReviewTeamEmails]

    if (division === 'DMCP') {
        receiverEmails.push(...config.dmcpReviewEmails)
    } else if (division === 'OACT') {
        receiverEmails.push(...config.oactEmails)
    }

    receiverEmails = pruneDuplicateEmails(receiverEmails)

    const questionResponseURL = rateSummaryQuestionResponseURL(
        rate.id,
        config.baseUrl
    )

    const data = {
        rateCertName,
        questionResponseURL,
        cmsRequestorDivision: division,
        stateResponseSubmitterEmail: latestResponse.addedBy.email,
        stateResponseSubmitterName: `${latestResponse.addedBy.givenName} ${latestResponse.addedBy.familyName}`,
        questionRound,
        dateAsked: formatCalendarDate(
            currentQuestion.createdAt,
            'America/Los_Angeles'
        ),
    }

    const result = await renderTemplate<typeof data>(
        'sendRateQuestionResponseCMSEmail',
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
            }New Responses for ${rateCertName}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
