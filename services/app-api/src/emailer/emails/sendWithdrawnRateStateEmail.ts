import { formatCalendarDate } from '@mc-review/dates';
import { ProgramType, RateType } from "../../domain-models";
import { EmailData } from "../emailer";
import { EmailConfiguration } from "../emailer";
import { findContractPrograms, renderTemplate, stripHTMLFromTemplate } from "../templateHelpers";
import { packageName as generatePackageName } from '@mc-review/hpp'
import { submissionSummaryURL } from '../generateURLs';
import { pruneDuplicateEmails } from '../formatters';

type WithdrawnFromContractData = {
    contractName: string,
    submissionURL: string
}

type WithdrawnRateEtaData = {
    rateName: string,
    withdrawnBy: string, //email
    withdrawnDate: string, // mm/dd/yyyy format in PT timezone.
    withdrawnReason: string,
    withdrawnFromContractData: WithdrawnFromContractData[]
}

export const sendWithdrawnRateStateEmail = async (
  config: EmailConfiguration,
  rate: RateType,
  statePrograms: ProgramType[]
): Promise<EmailData | Error> => {
    if (rate.consolidatedStatus !== 'WITHDRAWN') {
        return new Error('Rate consolidated status is not WITHDRAWN')
    }

    //check to make sure rate has a withdrawn action
    const latestRateRev = rate.packageSubmissions[0].rateRevision
    const reviewStatusActions = rate.reviewStatusActions

    if (!reviewStatusActions || reviewStatusActions.length === 0) {
        return new Error('Rate does not any have review actions')
    }

    const latestAction = reviewStatusActions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

    if (latestAction.actionType !== 'WITHDRAW') {
        return new Error('Rate latest review action was not a withdraw action')
    }

    // These contracts will not include linked contracts that are unlocked or in draft
    const withdrawnFromContracts = rate.withdrawnFromContracts

    if (!withdrawnFromContracts || withdrawnFromContracts.length === 0) {
        return new Error('Rate was withdrawn, but was not associated with any contracts')
    }

    const stateContactEmails: string[] = []
    const withdrawnFromContractData = []

    // parse contract data and collect state contact emails
    for (const contract of withdrawnFromContracts) {
        const latestContractRev = contract.packageSubmissions[0].contractRevision
        const pkgPrograms = findContractPrograms(latestContractRev, statePrograms)

        if (pkgPrograms instanceof Error) {
            return new Error(`Error parsing withdrawn from contract data for contract with ID: ${contract.id}. ${pkgPrograms.message}`)
        }

        const packageName = generatePackageName(
            contract.stateCode,
            contract.stateNumber,
            latestContractRev.formData.programIDs,
            pkgPrograms
        )

        const submissionURL = submissionSummaryURL(contract.id, config.baseUrl)

        withdrawnFromContractData.push({
            contractName: packageName,
            submissionURL
        })

        latestContractRev.formData.stateContacts.forEach((contact) => {
            if (contact.email) stateContactEmails.push(contact.email)
        })
    }

    const toAddresses = pruneDuplicateEmails([
        ...stateContactEmails,
        ...config.devReviewTeamEmails
    ])

    const etaData: WithdrawnRateEtaData = {
        rateName: latestRateRev.formData.rateCertificationName!,
        withdrawnBy: latestAction.updatedBy.email,
        withdrawnDate: formatCalendarDate(latestAction.updatedAt, 'America/Los_Angeles'),
        withdrawnReason: latestAction.updatedReason,
        withdrawnFromContractData,
    }

    const template = await renderTemplate<WithdrawnRateEtaData>('sendWithdrawnRateStateEmail', etaData)

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
            bodyHTML: template
        }
    }
}