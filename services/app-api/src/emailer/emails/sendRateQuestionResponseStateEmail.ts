import { formatCalendarDate } from '@mc-review/dates'
import { pruneDuplicateEmails } from '../formatters'
import type { EmailConfiguration, EmailData } from '..'
import type { RateQuestionType, RateType } from '../../domain-models'
import {
    stripHTMLFromTemplate,
    renderTemplate,
    getQuestionRound,
    getActuaryContactEmails,
    getRateSubmitterEmails,
    getRateStateContactEmails,
} from '../templateHelpers'
import { rateQuestionResponseURL } from '../generateURLs'

export const sendRateQuestionResponseStateEmail = async (
    rate: RateType,
    config: EmailConfiguration,
    questions: RateQuestionType[],
    currentQuestion: RateQuestionType
): Promise<EmailData | Error> => {
    const rateFormData = rate.packageSubmissions[0].rateRevision.formData
    const parentContractID = rate.parentContractID
    const shouldIncludeActuaries =
        rateFormData.actuaryCommunicationPreference === 'OACT_TO_ACTUARY'
    const division = currentQuestion.division

    if (!rateFormData.rateCertificationName) {
        return new Error(
            'Error getting rate name. Rate certification name was undefined.'
        )
    }

    const submitterEmails = getRateSubmitterEmails(rate)
    const stateContactEmails = getRateStateContactEmails(rate)
    const actuaryEmails = shouldIncludeActuaries
        ? getActuaryContactEmails(rate)
        : []

    const toAddresses = pruneDuplicateEmails([
        ...submitterEmails,
        ...stateContactEmails,
        ...actuaryEmails,
    ])

    const questionRound = getQuestionRound(questions, currentQuestion)

    if (questionRound instanceof Error) {
        return questionRound
    }

    const data = {
        packageName: rateFormData.rateCertificationName,
        questionResponseURL: rateQuestionResponseURL(
            parentContractID,
            currentQuestion.rateID,
            rate.packageSubmissions[0].contractRevisions[0].contract
                .contractSubmissionType,
            config.baseUrl
        ),
        cmsRequestorDivision: division,
        dateAsked: formatCalendarDate(
            currentQuestion.createdAt,
            'America/Los_Angeles'
        ),
    }

    const result = await renderTemplate<typeof data>(
        'sendRateQuestionResponseStateEmail',
        data
    )

    if (result instanceof Error) {
        return result
    } else {
        return {
            toAddresses: toAddresses,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }Response submitted to CMS for ${rateFormData.rateCertificationName}`,
            bodyText: stripHTMLFromTemplate(result),
            bodyHTML: result,
        }
    }
}
