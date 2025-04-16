import type { ContractType } from '../../domain-models'
import type { RateForDisplay } from '../../postgres/contractAndRates/withdrawContract'
import type {
    EmailConfiguration,
    EmailData,
    StateAnalystsEmails,
} from '../emailer'
import { pruneDuplicateEmails } from '../formatters'
import { rateSummaryURL, submissionSummaryURL } from '../generateURLs'
import { renderTemplate, stripHTMLFromTemplate } from '../templateHelpers'
import { findStatePrograms, packageName } from '@mc-review/hpp'
import { formatCalendarDate } from '@mc-review/dates'

type FormattedRateDisplayDataType = {
    rateCertificationName: string
    rateSummaryURL: string
}

export type withdrawContractEtaData = {
    contractName: string
    contractSummaryURL: string
    withdrawnBy: string
    withdrawnOn: string
    withdrawReason: string
    formattedRateDisplayData: FormattedRateDisplayDataType[]
}

export const parseAndValidateContractsAndRates = (
    contract: ContractType,
    rates: RateForDisplay[],
    config: EmailConfiguration
): withdrawContractEtaData | Error => {
    if (contract.consolidatedStatus !== 'WITHDRAWN') {
        return new Error('Contract consolidated status should be WITHDRAWN')
    }

    // Withdrawn Contract Name
    const contractName = packageName(
        contract.stateCode,
        contract.stateNumber,
        contract.packageSubmissions[0].contractRevision.formData.programIDs,
        findStatePrograms(contract.stateCode)
    )

    // Summary URL for the withdrawn submission
    const contractSummaryURL = submissionSummaryURL(contract.id, config.baseUrl)

    // Check to make sure withdrawn contract has actions
    const contractReviewStatusActions = contract.reviewStatusActions
    if (
        !contractReviewStatusActions ||
        contractReviewStatusActions.length === 0
    ) {
        return new Error('Contract does not have any review status actions')
    }

    // Latest stauts action gets us the withdrawn by info
    const latestStatusAction = contractReviewStatusActions.sort(
        (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0]
    if (latestStatusAction.actionType !== 'WITHDRAW') {
        return new Error('Latest contract review action is not WITHDRAW')
    }

    // Withdraw info
    const withdrawnBy = latestStatusAction.updatedBy.email
    const withdrawnOn = formatCalendarDate(
        latestStatusAction.updatedAt,
        'America/Los_Angeles'
    )
    const withdrawReason = latestStatusAction.updatedReason!

    // Rates withdrawn with the submission that will be displayed in the email
    const formattedRateDisplayData: FormattedRateDisplayDataType[] = rates.map(
        (rate) => ({
            rateCertificationName: rate.rateCertificationName,
            rateSummaryURL: rateSummaryURL(rate.id, config.baseUrl),
        })
    )

    return {
        contractName,
        contractSummaryURL,
        withdrawnBy,
        withdrawnOn,
        withdrawReason,
        formattedRateDisplayData,
    }
}

export const sendWithdrawnSubmissionCMSEmail = async (
    withdrawnContract: ContractType,
    ratesForDisplay: RateForDisplay[],
    stateAnalystsEmails: StateAnalystsEmails,
    config: EmailConfiguration
): Promise<EmailData | Error> => {
    const toAddresses = pruneDuplicateEmails([
        ...stateAnalystsEmails,
        ...config.dmcpSubmissionEmails,
        ...config.oactEmails,
        ...config.devReviewTeamEmails,
    ])

    const etaData = parseAndValidateContractsAndRates(
        withdrawnContract,
        ratesForDisplay,
        config
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
