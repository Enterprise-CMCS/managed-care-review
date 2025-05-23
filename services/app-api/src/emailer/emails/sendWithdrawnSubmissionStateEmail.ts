import type { ContractType } from '../../domain-models'
import type { EmailConfiguration, EmailData } from '../emailer'
import { pruneDuplicateEmails } from '../formatters'
import {
    renderTemplate,
    stripHTMLFromTemplate,
    parseEmailDataWithdrawSubmission,
    type RateForDisplayType,
} from '../templateHelpers'

export const sendWithdrawnSubmissionStateEmail = async (
    withdrawnContract: ContractType,
    ratesForDisplay: RateForDisplayType[],
    config: EmailConfiguration
): Promise<EmailData | Error> => {
    const stateContactEmails: string[] = []
    const contractRev = withdrawnContract.packageSubmissions[0].contractRevision
    contractRev.formData.stateContacts.forEach((contact) => {
        if (contact.email) stateContactEmails.push(contact.email)
    })

    const toAddresses = pruneDuplicateEmails([
        ...stateContactEmails,
        ...config.devReviewTeamEmails,
    ])

    const etaData = parseEmailDataWithdrawSubmission(
        withdrawnContract,
        ratesForDisplay,
        config,
        'WITHDRAW'
    )
    if (etaData instanceof Error) {
        return etaData
    }

    const template = await renderTemplate(
        'sendWithdrawnSubmissionStateEmail',
        etaData
    )

    if (template instanceof Error) {
        return template
    } else {
        return {
            toAddresses,
            replyToAddresses: [],
            sourceEmail: config.emailSource,
            subject: `${
                config.stage !== 'prod' ? `[${config.stage}] ` : ''
            }${etaData.contractName} was withdrawn by CMS`,
            bodyText: stripHTMLFromTemplate(template),
            bodyHTML: template,
        }
    }
}
