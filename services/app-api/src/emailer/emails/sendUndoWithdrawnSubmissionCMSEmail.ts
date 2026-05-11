import type { ContractType } from '../../domain-models'
import type {
    EmailConfiguration,
    EmailData,
    StateAnalystsEmails,
} from '../emailer'
import { pruneDuplicateEmails } from '../formatters'
import {
    renderTemplate,
    stripHTMLFromTemplate,
    parseEmailDataWithdrawSubmission,
    parseEmailDataUndoWithdrawEQROSubmission,
    type RateForDisplayType,
} from '../templateHelpers'

export const sendUndoWithdrawnSubmissionCMSEmail = async (
    contract: ContractType,
    ratesForDisplay: RateForDisplayType[],
    stateAnalystsEmails: StateAnalystsEmails,
    config: EmailConfiguration
): Promise<EmailData | Error> => {
    if (contract.contractSubmissionType === 'EQRO') {
        const toAddresses = pruneDuplicateEmails([
            ...config.dmcoEmails,
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
            'sendUndoWithdrawnEQROSubmissionCMSEmail',
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
                }${etaData.contractName} status was updated to '${
                    etaData.status
                }' by CMS`,
                bodyText: stripHTMLFromTemplate(template),
                bodyHTML: template,
            }
        }
    } else {
        const toAddresses = pruneDuplicateEmails([
            ...stateAnalystsEmails,
            ...config.dmcpSubmissionEmails,
            ...config.oactEmails,
            ...config.dmcoEmails,
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
            'sendUndoWithdrawnSubmissionCMSEmail',
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
