import type {
    ContractPackageSubmissionType,
    RevisionDiff,
} from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import { findStatePrograms } from '../state/findStatePrograms'
import { buildRevisionDiff } from './revisionDiffHelpers'
import { findContractWithHistory } from './findContractWithHistory'

type FindRevisionDiffArgs = {
    contractID: string
    olderContractRevisionID?: string | null
    newerContractRevisionID?: string | null
}

class InvalidRevisionDiffInputError extends Error {}

function resolveRevisionPair(
    packageSubmissions: ContractPackageSubmissionType[],
    args: FindRevisionDiffArgs
):
    | {
          olderSubmission: ContractPackageSubmissionType
          newerSubmission: ContractPackageSubmissionType
      }
    | InvalidRevisionDiffInputError {
    const contractSubmissions = packageSubmissions.filter((submission) => {
        return submission.contractRevision.submitInfo !== undefined
    })

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

    return buildRevisionDiff(
        contractWithHistory.id,
        selectedSubmissions.olderSubmission,
        selectedSubmissions.newerSubmission,
        statePrograms
    )
}

export {
    findRevisionDiffByContractID,
    InvalidRevisionDiffInputError,
    resolveRevisionPair,
}
export type { FindRevisionDiffArgs }
