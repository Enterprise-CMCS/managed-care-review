import type { ContractType } from '../../domain-models'
import type { EmailConfiguration, EmailData } from '../emailer'
import { pruneDuplicateEmails } from '../formatters'
import {
    renderTemplate,
    stripHTMLFromTemplate,
    parseEmailDataWithdrawSubmission,
    parseEmailDataUndoWithdrawEQROSubmission,
    type RateForDisplayType,
} from '../templateHelpers'

const stateContactEmailsForContract = (contract: ContractType): string[] => {
    const stateContactEmails: string[] = []
    const contractRev = contract.packageSubmissions[0].contractRevision
    contractRev.formData.stateContacts.forEach((contact) => {
        if (contact.email) stateContactEmails.push(contact.email)
    })

    return stateContactEmails
}

export const sendUndoWithdrawnSubmissionStateEmail = async (
    contract: ContractType,
    ratesForDisplay: RateForDisplayType[],
    config: EmailConfiguration
): Promise<EmailData | Error> => {
    if (contract.contractSubmissionType === 'EQRO') {
        const toAddresses = pruneDuplicateEmails([
            ...stateContactEmailsForContract(contract),
            ...config.devReviewTeamEmails,
        ])

        const etaData = parseEmailDataUndoWithdrawEQROSubmission(
            contract,
            ratesForDisplay,
            config
        )
        if (etaData instanceof Error) {
            return etaData
        }

        const template = await renderTemplate(
            'sendUndoWithdrawnEQROSubmissionStateEmail',
            {
                ...etaData,
                MCGDMCOContactEmail: 'MCGDMCOactions@cms.hhs.gov',
                CMSContactEmail: 'MC_Review_HelpDesk@cms.hhs.gov',
            }
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
                }${etaData.contractName} status was updated to '${
                    etaData.status
                }' by CMS`,
                bodyText: stripHTMLFromTemplate(template),
                bodyHTML: template,
            }
        }
    } else {
        const toAddresses = pruneDuplicateEmails([
            ...stateContactEmailsForContract(contract),
            ...config.devReviewTeamEmails,
        ])

        const etaData = parseEmailDataWithdrawSubmission(
            contract,
            ratesForDisplay,
            config,
            'UNDO_WITHDRAW'
        )
        if (etaData instanceof Error) {
            return etaData
        }

        const template = await renderTemplate(
            'sendUndoWithdrawnSubmissionStateEmail',
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
                }${etaData.contractName} status update`,
                bodyText: stripHTMLFromTemplate(template),
                bodyHTML: template,
            }
        }
    }
}
