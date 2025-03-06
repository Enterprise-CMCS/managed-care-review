import { formatCalendarDate } from 'Users/juanruiz/managed-care-review/packages/dates/build'
import type { RateReviewType, RateType } from '../../domain-models'
import type { StateContact } from '../../gen/gqlServer'
import type { EmailData, EmailConfiguration } from '../emailer'
import { pruneDuplicateEmails } from '../formatters'
import { submissionSummaryURL } from '../generateURLs'
import { renderTemplate, stripHTMLFromTemplate } from '../templateHelpers'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseContractsAndContacts = (
    contractRevisions: any,
    config: EmailConfiguration
) => {
    const stateContactEmails: string[] = []
    const associatedContracts: associatedContracts[] = []
    const seenContracts = new Set()

    //Iterate through all the contracts to save the contract name and generate a url - avoiding duplicates
    for (const contract of contractRevisions) {
        const contractInfo = {
            contractName: contract.contractName,
            summaryURL: submissionSummaryURL(
                contract.contractID,
                config.baseUrl
            ),
        }

        if (!seenContracts.has(contractInfo.contractName)) {
            seenContracts.add(contractInfo.contractName)
            associatedContracts.push(contractInfo)
        }

        contract.formData.stateContacts.forEach((contact: StateContact) => {
            if (contact.email) stateContactEmails.push(contact.email)
        })
    }

    // eslint-disable-next-line no-console
    console.log('associatedContracts:', associatedContracts)
    // eslint-disable-next-line no-console
    console.log('stateContactEmails:', stateContactEmails)

    return {
        associatedContracts,
        stateContactEmails,
    }
}

export const validateAndParseUnwithdrawnRate = (
    rate: RateType,
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
        return new Error('Rate does not have any review actions')
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
        rate.packageSubmissions[0].rateRevision.formData.rateCertificationName!

    //Gathering contracts and state contacts associated to rate
    const contractRevisions = rate.packageSubmissions[0].contractRevisions
    if (!contractRevisions || contractRevisions.length === 0) {
        return new Error('Rate does not have any contract revisions')
    }
    const { associatedContracts, stateContactEmails } =
        parseContractsAndContacts(contractRevisions, config)

    return {
        latestStatusAction,
        rateCertificationName,
        associatedContracts,
        stateContactEmails,
    }
}

export const sendUndoWithdrawnRateStateEmail = async (
    config: EmailConfiguration,
    rate: RateType
): Promise<EmailData | Error> => {
    const undoWithdrawnRateData = validateAndParseUnwithdrawnRate(rate, config)

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
