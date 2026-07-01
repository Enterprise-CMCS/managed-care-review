import type {
    ContractPackageSubmissionType,
    SubmissionDiff,
} from '../../domain-models'
import { findStatePrograms } from '../state/findStatePrograms'
import type { ExtendedPrismaClient } from '../prismaClient'
import { findContractWithHistory } from './findContractWithHistory'
import { buildSubmissionDiff } from './submissionDiffHelpers'

type FindSubmissionDiffArgs = {
    contractID: string
    olderContractRevisionID?: string | null
    newerContractRevisionID?: string | null
}

class InvalidSubmissionDiffInputError extends Error {}

function resolveSubmissionPair(
    packageSubmissions: ContractPackageSubmissionType[],
    args: FindSubmissionDiffArgs
):
    | {
          olderSubmission: ContractPackageSubmissionType
          newerSubmission: ContractPackageSubmissionType
      }
    | InvalidSubmissionDiffInputError {
    const contractSubmissions = packageSubmissions.filter((submission) => {
        return submission.contractRevision.submitInfo !== undefined
    })

    if (contractSubmissions.length < 2) {
        return new InvalidSubmissionDiffInputError(
            `Contract must have at least two submitted revisions to build a diff`
        )
    }

    if (
        (args.olderContractRevisionID && !args.newerContractRevisionID) ||
        (!args.olderContractRevisionID && args.newerContractRevisionID)
    ) {
        return new InvalidSubmissionDiffInputError(
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
        return new InvalidSubmissionDiffInputError(
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
        return new InvalidSubmissionDiffInputError(
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

async function findSubmissionDiffByContractID(
    client: ExtendedPrismaClient,
    args: FindSubmissionDiffArgs
): Promise<SubmissionDiff | Error> {
    const contractWithHistory = await findContractWithHistory(
        client,
        args.contractID
    )

    if (contractWithHistory instanceof Error) {
        return contractWithHistory
    }

    const selectedSubmissions = resolveSubmissionPair(
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

    return buildSubmissionDiff(
        contractWithHistory.id,
        selectedSubmissions.olderSubmission,
        selectedSubmissions.newerSubmission,
        statePrograms
    )
}

export { findSubmissionDiffByContractID, InvalidSubmissionDiffInputError }
export type { FindSubmissionDiffArgs }
