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
    const receiverEmails = [...config.dmcoEmails, ...config.devReviewTeamEmails]

    // Non-EQRO contracts also notify state analysts, DMCP, and OACT
    if (withdrawnContract.contractSubmissionType !== 'EQRO') {
        receiverEmails.push(
            ...stateAnalystsEmails,
            ...config.dmcpSubmissionEmails,
            ...config.oactEmails
        )
    }

    const toAddresses = pruneDuplicateEmails(receiverEmails)

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
