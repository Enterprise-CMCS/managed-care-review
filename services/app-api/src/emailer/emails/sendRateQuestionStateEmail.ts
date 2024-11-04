import type { RateQuestionType, RateType } from '../../domain-models'
import type { EmailConfiguration, EmailData } from '../emailer'
import {
    getActuaryContactEmails,
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
    const contractRevisions = rate.packageSubmissions[0].contractRevisions
    const rateFormData = rate.packageSubmissions[0].rateRevision.formData
    const parentContractID = rate.parentContractID
    const shouldIncludeActuaries =
        rateFormData.actuaryCommunicationPreference === 'OACT_TO_ACTUARY'

    if (!rateFormData.rateCertificationName) {
        return new Error(
            'Error getting rate name. Rate certification name was undefined.'
        )
    }

    const submitterEmails = contractRevisions.reduce(
        (contacts: string[], cr) => {
            if (cr.submitInfo?.updatedBy.email) {
                return contacts.concat(cr.submitInfo.updatedBy.email)
            }
            return contacts
        },
        []
    )

    const stateContactEmails = contractRevisions.reduce(
        (contacts: string[], cr) => {
            const stateContacts: string[] = []
            if (cr.formData.stateContacts.length) {
                cr.formData.stateContacts.forEach((stateContact) => {
                    if (stateContact.email) {
                        stateContacts.push(stateContact.email)
                    }
                })
            }
            return contacts.concat(stateContacts)
        },
        []
    )

    const actuaryEmails = shouldIncludeActuaries
        ? getActuaryContactEmails(rateFormData)
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
            'America/New_York'
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
