import type {
    ContractPackageSubmissionType,
    RevisionDiff,
} from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import { findStatePrograms } from '../state/findStatePrograms'
import { findContractWithHistory } from '../contractAndRates/findContractWithHistory'
import { findRateWithHistory } from '../contractAndRates/findRateWithHistory'
import { buildRevisionDiff } from './revisionDiffHelpers'

type FindRevisionDiffArgs = {
    contractID: string
    olderContractRevisionID?: string | null
    newerContractRevisionID?: string | null
}

class InvalidRevisionDiffInputError extends Error {}

function selectLatestUniqueContractSubmissions(
    packageSubmissions: ContractPackageSubmissionType[]
): ContractPackageSubmissionType[] {
    const uniqueSubmissionsByRevisionID = new Map<
        string,
        ContractPackageSubmissionType
    >()

    for (const submission of packageSubmissions) {
        if (submission.contractRevision.submitInfo === undefined) {
            continue
        }

        const existingSubmission = uniqueSubmissionsByRevisionID.get(
            submission.contractRevision.id
        )

        if (
            !existingSubmission ||
            existingSubmission.submitInfo.updatedAt.getTime() <
                submission.submitInfo.updatedAt.getTime()
        ) {
            uniqueSubmissionsByRevisionID.set(
                submission.contractRevision.id,
                submission
            )
        }
    }

    return [...uniqueSubmissionsByRevisionID.values()].sort(
        (leftSubmission, rightSubmission) =>
            rightSubmission.submitInfo.updatedAt.getTime() -
            leftSubmission.submitInfo.updatedAt.getTime()
    )
}

function resolveRevisionPair(
    packageSubmissions: ContractPackageSubmissionType[],
    args: FindRevisionDiffArgs
):
    | {
          olderSubmission: ContractPackageSubmissionType
          newerSubmission: ContractPackageSubmissionType
      }
    | InvalidRevisionDiffInputError {
    const contractSubmissions =
        selectLatestUniqueContractSubmissions(packageSubmissions)

    if (contractSubmissions.length < 2) {
        return new InvalidRevisionDiffInputError(
            `Contract must have at least two submitted revisions to build a diff`
        )
    }

    if (
        (args.olderContractRevisionID && !args.newerContractRevisionID) ||
        (!args.olderContractRevisionID && args.newerContractRevisionID)
    ) {
        return new InvalidRevisionDiffInputError(
            `olderContractRevisionID and newerContractRevisionID must both be provided when selecting a specific comparison`
        )
    }

    if (!args.olderContractRevisionID && !args.newerContractRevisionID) {
        return {
            newerSubmission: contractSubmissions[0],
            olderSubmission: contractSubmissions[1],
        }
    }

    if (args.olderContractRevisionID === args.newerContractRevisionID) {
        return new InvalidRevisionDiffInputError(
            `olderContractRevisionID and newerContractRevisionID must be different revisions`
        )
    }

    const selectedSubmissions = contractSubmissions.filter((submission) => {
        return (
            submission.contractRevision.id === args.olderContractRevisionID ||
            submission.contractRevision.id === args.newerContractRevisionID
        )
    })

    if (selectedSubmissions.length !== 2) {
        return new InvalidRevisionDiffInputError(
            `Could not find both submitted revisions requested for comparison`
        )
    }

    const [olderSubmission, newerSubmission] = [...selectedSubmissions].sort(
        (leftSubmission, rightSubmission) =>
            leftSubmission.submitInfo.updatedAt.getTime() -
            rightSubmission.submitInfo.updatedAt.getTime()
    )

    return {
        olderSubmission,
        newerSubmission,
    }
}

/**
 * Returns the IDs of rates in either compared submission that are linked rates
 */
async function findLinkedRateIDs(
    client: ExtendedPrismaClient,
    contractID: string,
    olderSubmission: ContractPackageSubmissionType,
    newerSubmission: ContractPackageSubmissionType
): Promise<Set<string> | Error> {
    // Only added rates display linked status, so only they need the parent contract lookup.
    const olderRateIDs = new Set(
        olderSubmission.rateRevisions.map((rateRevision) => rateRevision.rateID)
    )
    const addedRateIDs = new Set(
        newerSubmission.rateRevisions
            .map((rateRevision) => rateRevision.rateID)
            .filter((rateID) => !olderRateIDs.has(rateID))
    )

    const linkedRateIDs = new Set<string>()

    for (const rateID of addedRateIDs) {
        // findRateWithHistory derives parentContractID: the contract that submitted this rate.
        const rate = await findRateWithHistory(client, rateID)

        if (rate instanceof Error) {
            return rate
        }

        if (rate.parentContractID !== contractID) {
            linkedRateIDs.add(rateID)
        }
    }

    return linkedRateIDs
}

async function findRevisionDiffByContractID(
    client: ExtendedPrismaClient,
    args: FindRevisionDiffArgs
): Promise<RevisionDiff | Error> {
    const contractWithHistory = await findContractWithHistory(
        client,
        args.contractID
    )

    if (contractWithHistory instanceof Error) {
        return contractWithHistory
    }

    const selectedSubmissions = resolveRevisionPair(
        contractWithHistory.packageSubmissions,
        args
    )

    if (selectedSubmissions instanceof Error) {
        return selectedSubmissions
    }

    const statePrograms = findStatePrograms(contractWithHistory.stateCode)
    if (statePrograms instanceof Error) {
        return statePrograms
    }

    // Look up which rates are linked here then pass the result in like statePrograms above.
    const linkedRateIDs = await findLinkedRateIDs(
        client,
        contractWithHistory.id,
        selectedSubmissions.olderSubmission,
        selectedSubmissions.newerSubmission
    )
    if (linkedRateIDs instanceof Error) {
        return linkedRateIDs
    }

    return buildRevisionDiff(
        contractWithHistory.id,
        selectedSubmissions.olderSubmission,
        selectedSubmissions.newerSubmission,
        statePrograms,
        linkedRateIDs
    )
}

export {
    findRevisionDiffByContractID,
    InvalidRevisionDiffInputError,
    resolveRevisionPair,
}
export type { FindRevisionDiffArgs }
