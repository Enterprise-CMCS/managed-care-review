import type { RateQuestionType, RateType } from '../../domain-models'
import type { EmailConfiguration, EmailData } from '../emailer'
import {
    getActuaryContactEmails,
    getRateStateContactEmails,
    getRateSubmitterEmails,
    renderTemplate,
    stripHTMLFromTemplate,
} from '../templateHelpers'
import { formatCalendarDate } from '../../common-code/dateHelpers'
import { pruneDuplicateEmails } from '../formatters'
import { rateQuestionResponseURL } from '../generateURLs'

export const sendRateQuestionStateEmail = async (
    rate: RateType,
    config: EmailConfiguration,
    rateQuestion: RateQuestionType
): Promise<EmailData | Error> => {
    const rateFormData = rate.packageSubmissions[0].rateRevision.formData
    const parentContractID = rate.parentContractID
    const shouldIncludeActuaries =
        rateFormData.actuaryCommunicationPreference === 'OACT_TO_ACTUARY'

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

    const data = {
        packageName: rateFormData.rateCertificationName,
        questionResponseURL: rateQuestionResponseURL(
            parentContractID,
            rateQuestion.rateID,
            config.baseUrl
        ),
        cmsRequestorEmail: rateQuestion.addedBy.email,
        cmsRequestorName: `${rateQuestion.addedBy.givenName} ${rateQuestion.addedBy.familyName}`,
        cmsRequestorDivision: rateQuestion.division,
        dateAsked: formatCalendarDate(
            rateQuestion.createdAt,
            'America/Los_Angeles'
        ),
    }

    const template = await renderTemplate<typeof data>(
        'sendQuestionStateEmail',
        data
    )

    if (template instanceof Error) {
        return template
    } else {
        return {
            toAddresses: toAddresses,
            ccAddresses: [...config.dmcpSubmissionEmails],
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }New questions about ${rateFormData.rateCertificationName}`,
            bodyText: stripHTMLFromTemplate(template),
            bodyHTML: template,
        }
    }
}
