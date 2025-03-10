import { formatCalendarDate } from '@mc-review/dates'
import type {
    ContractRevisionType,
    ProgramType,
    RateReviewType,
    RateType,
} from '../../domain-models'
import type { StateContact } from '../../gen/gqlServer'
import type { EmailData, EmailConfiguration } from '../emailer'
import { pruneDuplicateEmails } from '../formatters'
import { submissionSummaryURL } from '../generateURLs'
import {
    findContractPrograms,
    renderTemplate,
    stripHTMLFromTemplate,
} from '../templateHelpers'
import { packageName as generatePackageName } from '@mc-review/hpp'

type ValidatedUnWithdrawnRate = {
    latestStatusAction: RateReviewType
    rateCertificationName: string
    stateContactEmails: string[]
    associatedContracts: associatedContracts[]
}

type associatedContracts = {
    contractName: string
    summaryURL: string
}

type undoWithdrawnRateEtaData = {
    rateName: string
    updatedBy: string
    updatedOn: string // mm/dd/yyyy format in PT timezone.
    reason: string
    associatedContracts: associatedContracts[]
}

//This parses for data related to associated contracts and contacts (used within validateAndParseUnwithdrawnRate)
const parseContractsAndContacts = (
    contractRevisions: ContractRevisionType[],
    statePrograms: ProgramType[],
    config: EmailConfiguration
) => {
    const stateContactEmails: string[] = []
    const associatedContracts: associatedContracts[] = []
    const seenContracts = new Set() //Used to avoid duplicates below

    //Iterate through all the contracts to save the contract name and generate a url - avoiding duplicates
    for (const contractRev of contractRevisions) {
        const pkgPrograms = findContractPrograms(contractRev, statePrograms)

        if (pkgPrograms instanceof Error) {
            return new Error(
                `Error parsing contract revision for package programs: ${contractRev.id}. ${pkgPrograms.message}`
            )
        }

        const contractInfo = {
            contractName: generatePackageName(
                contractRev.contract.stateCode,
                contractRev.contract.stateNumber,
                contractRev.formData.programIDs,
                pkgPrograms
            ),
            summaryURL: submissionSummaryURL(
                contractRev.contract.id,
                config.baseUrl
            ),
        }

        if (!seenContracts.has(contractInfo.contractName)) {
            seenContracts.add(contractInfo.contractName)
            associatedContracts.push(contractInfo)
        }

        contractRev.formData.stateContacts.forEach((contact: StateContact) => {
            if (contact.email) stateContactEmails.push(contact.email)
        })
    }

    return {
        associatedContracts,
        stateContactEmails,
    }
}

//Validates the unwithdrawn rate and parses it for necessary data
export const validateAndParseUnwithdrawnRate = (
    rate: RateType,
    statePrograms: ProgramType[],
    config: EmailConfiguration
): Error | ValidatedUnWithdrawnRate => {
    if (rate.consolidatedStatus !== 'RESUBMITTED') {
        return new Error('Rate consolidated status should be RESUBMITTED')
    }

    // Ensuring withdrawnFromContracts was cleared
    const withdrawnFromContracts = rate.withdrawnFromContracts
    if (withdrawnFromContracts && withdrawnFromContracts.length > 0) {
        return new Error('withdrawnFromContracts should be empty')
    }

    //check to make sure rate has actions
    const reviewStatusActions = rate.reviewStatusActions
    if (!reviewStatusActions || reviewStatusActions.length === 0) {
        return new Error('Rate does not have any review status actions')
    }

    //This gets us update info 'updatedBy/updatedAt/updateReason'
    const latestStatusAction = reviewStatusActions.sort(
        (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0]
    if (latestStatusAction.actionType !== 'UNDER_REVIEW') {
        return new Error('Latest rate review action is not UNDER_REVIEW')
    }

    //This gets us the rate name
    const rateCertificationName =
        rate.packageSubmissions[0].rateRevision.formData.rateCertificationName
    if (!rateCertificationName) {
        return new Error('rateCertificationName is missing')
    }

    //Gathering contracts and state contacts associated to rate
    const contractRevisions = rate.packageSubmissions[0].contractRevisions
    if (contractRevisions.length === 0) {
        return new Error('Rate does not have any contract revisions')
    }
    const parsedContractsAndContacts = parseContractsAndContacts(
        contractRevisions,
        statePrograms,
        config
    )

    if (parsedContractsAndContacts instanceof Error) {
        return parsedContractsAndContacts
    }

    const { associatedContracts, stateContactEmails } =
        parsedContractsAndContacts

    return {
        latestStatusAction,
        rateCertificationName,
        associatedContracts,
        stateContactEmails,
    }
}

export const sendUndoWithdrawnRateStateEmail = async (
    rate: RateType,
    statePrograms: ProgramType[],
    config: EmailConfiguration
): Promise<EmailData | Error> => {
    const undoWithdrawnRateData = validateAndParseUnwithdrawnRate(
        rate,
        statePrograms,
        config
    )

    if (undoWithdrawnRateData instanceof Error) {
        return undoWithdrawnRateData
    }

    const {
        latestStatusAction, //Contains update information
        rateCertificationName, //Rate name
        associatedContracts, //Contracts connected to the rate
        stateContactEmails,
    } = undoWithdrawnRateData

    const toAddresses = pruneDuplicateEmails([
        ...stateContactEmails,
        ...config.devReviewTeamEmails,
    ])

    const etaData: undoWithdrawnRateEtaData = {
        rateName: rateCertificationName,
        updatedBy: latestStatusAction.updatedBy.email,
        updatedOn: formatCalendarDate(
            latestStatusAction.updatedAt,
            'America/Los_Angeles'
        ),
        reason: latestStatusAction.updatedReason,
        associatedContracts: associatedContracts,
    }

    const template = await renderTemplate<undoWithdrawnRateEtaData>(
        'sendUndoWithdrawnRateStateEmail',
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
            }${etaData.rateName} was unwithdrawn`,
            bodyText: stripHTMLFromTemplate(template),
            bodyHTML: template,
        }
    }
}
