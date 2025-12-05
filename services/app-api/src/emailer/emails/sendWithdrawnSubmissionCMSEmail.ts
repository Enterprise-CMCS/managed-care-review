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
    type RateForDisplayType,
} from '../templateHelpers'

export const sendWithdrawnSubmissionCMSEmail = async (
    withdrawnContract: ContractType,
    ratesForDisplay: RateForDisplayType[],
    stateAnalystsEmails: StateAnalystsEmails,
    config: EmailConfiguration
): Promise<EmailData | Error> => {
    const toAddresses = pruneDuplicateEmails([
        ...stateAnalystsEmails,
        ...config.dmcpSubmissionEmails,
        ...config.oactEmails,
        ...config.dmcoEmails,
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
        'sendWithdrawnSubmissionCMSEmail',
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
