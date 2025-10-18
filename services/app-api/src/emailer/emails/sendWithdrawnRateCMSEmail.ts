import { formatCalendarDate } from '@mc-review/dates'
import type {
    ProgramType,
    RateRevisionType,
    RateType,
    RateReviewType,
} from '../../domain-models'
import type {
    EmailData,
    StateAnalystsEmails,
    EmailConfiguration,
} from '../emailer'
import {
    findContractPrograms,
    renderTemplate,
    stripHTMLFromTemplate,
} from '../templateHelpers'
import { packageName as generatePackageName } from '@mc-review/submissions'
import { rateSummaryURL, submissionSummaryURL } from '../generateURLs'
import { pruneDuplicateEmails } from '../formatters'

type WithdrawnFromContractData = {
    contractName: string
    submissionURL: string
}

type WithdrawnRateEtaData = {
    rateName: string
    withdrawnBy: string //email
    withdrawnDate: string // mm/dd/yyyy format in PT timezone.
    withdrawnReason: string
    withdrawnFromContractData: WithdrawnFromContractData[]
    summaryURL: string // rate summary url
}

type ValidatedWithdrawnRate = {
    latestRateRev: RateRevisionType
    latestAction: RateReviewType
    withdrawnFromContractData: WithdrawnFromContractData[]
    stateContactEmails: string[]
}

/**
 * Validates and parses a withdrawn rate, ensuring it meets specific criteria and extracting relevant data.
 *
 * @param {RateType} rate - The rate object to validate and parse.
 * @param {ProgramType[]} statePrograms - An array of state programs to be used for validation.
 * @param {EmailConfiguration} config - Configuration object containing email-related settings.
 * @returns {Error | ValidatedWithdrawnRate} - Returns an Error object if validation fails, otherwise returns a ValidatedWithdrawnRate object containing parsed data.
 **/
export const validateAndParseWithdrawnRate = (
    rate: RateType,
    statePrograms: ProgramType[],
    config: EmailConfiguration
): Error | ValidatedWithdrawnRate => {
    if (rate.consolidatedStatus !== 'WITHDRAWN') {
        return new Error('Rate consolidated status is not WITHDRAWN')
    }

    //check to make sure rate has a withdrawn action
    const reviewStatusActions = rate.reviewStatusActions

    if (!reviewStatusActions || reviewStatusActions.length === 0) {
        return new Error('Rate does not have any review actions')
    }

    const latestAction = reviewStatusActions.sort(
        (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0]

    if (latestAction.actionType !== 'WITHDRAW') {
        return new Error('Rate latest review action was not a withdraw action')
    }

    // These contracts will not include linked contracts that are unlocked or in draft
    const withdrawnFromContracts = rate.withdrawnFromContracts ?? []

    const latestRateRev = rate.packageSubmissions[0].rateRevision
    if (!latestRateRev) {
        return new Error('Rate does not have a rate revision')
    }

    const withdrawnFromContractData: WithdrawnFromContractData[] = []
    const stateContactEmails: string[] = []

    if (withdrawnFromContracts.length > 0) {
        for (const contract of withdrawnFromContracts) {
            // Get latest revision to generate package name. Use draft revision if contract is unlocked.
            const latestContractRev =
                contract.consolidatedStatus === 'UNLOCKED'
                    ? contract.draftRevision!
                    : contract.packageSubmissions[0].contractRevision

            const pkgPrograms = findContractPrograms(
                latestContractRev,
                statePrograms
            )

            if (pkgPrograms instanceof Error) {
                return new Error(
                    `Error parsing withdrawn from contract data for contract with ID: ${contract.id}. ${pkgPrograms.message}`
                )
            }

            const packageName = generatePackageName(
                contract.stateCode,
                contract.stateNumber,
                latestContractRev.formData.programIDs,
                pkgPrograms
            )

            const submissionURL = submissionSummaryURL(
                contract.id,
                config.baseUrl
            )

            withdrawnFromContractData.push({
                contractName: packageName,
                submissionURL,
            })

            latestContractRev.formData.stateContacts.forEach((contact) => {
                if (contact.email) stateContactEmails.push(contact.email)
            })
        }
    } else {
        // If rate was orphaned rate, then we use the last rate submission that had contracts to send the email to.
        const latestSubmissionWithContracts = rate.packageSubmissions.find(
            (pkg) => pkg.contractRevisions.length > 0
        )

        if (latestSubmissionWithContracts) {
            for (const cr of latestSubmissionWithContracts.contractRevisions) {
                cr.formData.stateContacts.forEach((contact) => {
                    if (contact.email) stateContactEmails.push(contact.email)
                })
            }
        }
    }

    return {
        latestRateRev,
        latestAction,
        withdrawnFromContractData,
        stateContactEmails,
    }
}

export const sendWithdrawnRateCMSEmail = async (
    config: EmailConfiguration,
    rate: RateType,
    statePrograms: ProgramType[],
    stateAnalystsEmails: StateAnalystsEmails
): Promise<EmailData | Error> => {
    // validate the withdrawn rate
    const withdrawnRateData = validateAndParseWithdrawnRate(
        rate,
        statePrograms,
        config
    )

    if (withdrawnRateData instanceof Error) {
        return withdrawnRateData
    }

    const { latestRateRev, latestAction, withdrawnFromContractData } =
        withdrawnRateData

    const toAddresses = pruneDuplicateEmails([
        ...stateAnalystsEmails,
        ...config.dmcpSubmissionEmails,
        ...config.oactEmails,
        ...config.devReviewTeamEmails,
    ])

    const summaryURL = rateSummaryURL(rate.id, config.baseUrl)

    const etaData: WithdrawnRateEtaData = {
        rateName: latestRateRev.formData.rateCertificationName!,
        withdrawnBy: latestAction.updatedBy.email,
        withdrawnDate: formatCalendarDate(
            latestAction.updatedAt,
            'America/Los_Angeles'
        ),
        withdrawnReason: latestAction.updatedReason,
        withdrawnFromContractData,
        summaryURL,
    }

    const template = await renderTemplate<WithdrawnRateEtaData>(
        'sendWithdrawnRateCMSEmail',
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
            }${etaData.rateName} was withdrawn`,
            bodyText: stripHTMLFromTemplate(template),
            bodyHTML: template,
        }
    }
}
