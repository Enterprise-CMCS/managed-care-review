import type {
    ContractType,
    ContractRevisionType,
    RateRevisionType,
} from '../../domain-models/contractAndRates'
import { contractSchema } from '../../domain-models/contractAndRates'
import type { ContractWithoutDraftRatesType } from '../../domain-models/contractAndRates/baseContractRateTypes'
import type { ContractPackageSubmissionType } from '../../domain-models/contractAndRates/packageSubmissions'
import {
    DRAFT_PARENT_PLACEHOLDER,
    rateWithoutDraftContractsToDomainModel,
} from './parseRateWithHistory'
import type { ContractRevisionTableWithFormData } from './prismaSharedContractRateHelpers'
import {
    setDateAddedForContractRevisions,
    setDateAddedForRateRevisions,
} from './prismaSharedContractRateHelpers'
import {
    rateRevisionToDomainModel,
    unsortedRatesRevisionsToDomainModel,
} from './prismaSharedContractRateHelpers'
import {
    contractFormDataToDomainModel,
    convertUpdateInfoToDomainModel,
    getContractRateStatus,
} from './prismaSharedContractRateHelpers'
import type { ContractTableWithoutDraftRates } from './prismaSubmittedContractHelpers'
import type { ContractTableFullPayload } from './prismaFullContractRateHelpers'

// This function might be generally useful later on. It takes an array of objects
// that can be errors and either returns the first error, or returns the list but with
// the assertion that none of the elements in the array are errors.
function arrayOrFirstError<T>(
    arrayWithPossibleErrors: (T | Error)[]
): T[] | Error {
    if (arrayWithPossibleErrors.every((i): i is T => !(i instanceof Error))) {
        return arrayWithPossibleErrors
    }

    const firstError = arrayWithPossibleErrors.find(
        (t): t is Error => t instanceof Error
    )
    if (!firstError) {
        return Error(
            'Should Not Happen: something in the array was an error but we couldnt find it'
        )
    }

    return firstError
}

// parseContractWithHistory returns a ContractType with a full set of
// ContractRevisions in reverse chronological order. Each revision is a change to this
// Contract with submit and unlock info. Changes to the data of this contract, or changes
// to the data or relations of associate revisions will all surface as new ContractRevisions
function parseContractWithHistory(
    contract: ContractTableFullPayload
): ContractType | Error {
    const contractWithHistory = contractWithHistoryToDomainModel(contract)
    if (contractWithHistory instanceof Error) {
        console.warn(
            `ERROR: attempting to parse prisma contract with history failed: ${contractWithHistory.message}`
        )
        return contractWithHistory
    }

    const parseContract = contractSchema.safeParse(contractWithHistory)
    if (!parseContract.success) {
        const error = `ERROR: attempting to parse prisma contract with history failed: ${parseContract.error}`
        console.warn(error, contractWithHistory, parseContract.error)
        return parseContract.error
    }

    return parseContract.data
}

function contractRevisionToDomainModel(
    revision: ContractRevisionTableWithFormData
): ContractRevisionType {
    return {
        id: revision.id,
        contract: revision.contract,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        submitInfo: convertUpdateInfoToDomainModel(revision.submitInfo),
        unlockInfo: convertUpdateInfoToDomainModel(revision.unlockInfo),

        formData: contractFormDataToDomainModel(revision),
    }
}

// contractWithHistoryToDomainModelWithoutRates constructs a history for this particular contract including changes to all of its
// revisions and all related rate revisions, including added and removed rates, but eliding any draft rates to break the recursion chain.
function contractWithHistoryToDomainModelWithoutRates(
    contract: ContractTableWithoutDraftRates
): ContractWithoutDraftRatesType | Error {
    // We iterate through each contract revision in order, adding it as a revision in the history
    // then iterate through each of its rates, constructing a history of any rates that changed
    // between contract revision updates
    const contractRevisions = contract.revisions

    let draftRevision: ContractRevisionType | undefined = undefined
    const submittedRevisions: ContractRevisionType[] = []

    for (const contractRev of contractRevisions) {
        // If we have a draft revision
        // We set the draft revision aside, format it properly
        if (!contractRev.submitInfo) {
            if (draftRevision) {
                return new Error(
                    'PROGRAMMING ERROR: a contract may not have multiple drafts simultaneously. ID: ' +
                        contract.id
                )
            }

            draftRevision = contractRevisionToDomainModel(contractRev)
            // skip the rest of the processing
            continue
        }
        submittedRevisions.push(contractRevisionToDomainModel(contractRev))
    }

    // Every revision has a set of submissions it was part of.
    const packageSubmissions: ContractPackageSubmissionType[] = []
    for (const revision of contract.revisions) {
        for (const submission of revision.relatedSubmisions) {
            // submittedThings
            const submittedContract = submission.submittedContracts.map((c) =>
                contractRevisionToDomainModel(c)
            )
            const submittedRates = submission.submittedRates.map((r) =>
                rateRevisionToDomainModel(r)
            )

            const submitedRevs: ContractPackageSubmissionType['submittedRevisions'] =
                []
            for (const contractRev of submittedContract) {
                submitedRevs.push(contractRev)
            }
            for (const rateRev of submittedRates) {
                if (rateRev instanceof Error) {
                    return rateRev
                }
                submitedRevs.push(rateRev)
            }

            const relatedRateRevisions = submission.submissionPackages
                .filter((p) => p.contractRevisionID === revision.id)
                .sort((a, b) => a.ratePosition - b.ratePosition)
                .map((p) => p.rateRevision)

            const rateRevisions =
                unsortedRatesRevisionsToDomainModel(relatedRateRevisions)

            packageSubmissions.push({
                submitInfo: {
                    updatedAt: submission.updatedAt,
                    updatedBy: submission.updatedBy,
                    updatedReason: submission.updatedReason,
                },
                submittedRevisions: submitedRevs,
                contractRevision: contractRevisionToDomainModel(revision),
                rateRevisions: rateRevisions,
            })
        }
    }

    // get references to every contract and rate revision in submission order and
    // set the document dateAdded dates accordingly.
    const packageContractRevisions: ContractRevisionType[] = []
    const packageRateRevisions: { [id: string]: RateRevisionType[] } = {}
    for (const pkg of packageSubmissions) {
        packageContractRevisions.push(pkg.contractRevision)
        for (const rrev of pkg.rateRevisions) {
            if (!(rrev.rateID in packageRateRevisions)) {
                packageRateRevisions[rrev.rateID] = []
            }
            packageRateRevisions[rrev.rateID].push(rrev)
        }
    }
    setDateAddedForContractRevisions(packageContractRevisions)

    for (const rrevs of Object.values(packageRateRevisions)) {
        setDateAddedForRateRevisions(rrevs)
    }

    return {
        id: contract.id,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
        mccrsID: contract.mccrsID || undefined,
        status: getContractRateStatus(contract.revisions),
        stateCode: contract.stateCode,
        stateNumber: contract.stateNumber,
        draftRevision,
        revisions: submittedRevisions.reverse(),
        packageSubmissions: packageSubmissions.reverse(),
    }
}

// contractWithHistoryToDomainModel constructs a history for this particular contract including changes to all of its
// revisions and all related rate revisions, including added and removed rates
function contractWithHistoryToDomainModel(
    contract: ContractTableFullPayload
): ContractType | Error {
    const contractWithoutRates =
        contractWithHistoryToDomainModelWithoutRates(contract)
    if (contractWithoutRates instanceof Error) {
        return contractWithoutRates
    }

    if (
        contractWithoutRates.status === 'SUBMITTED' ||
        contractWithoutRates.status === 'RESUBMITTED'
    ) {
        return contractWithoutRates
    }

    // since we have a draft revision, we should also hold onto any set draftRates for later
    const draftRatesOrErrors = contract.draftRates.map((dr) =>
        rateWithoutDraftContractsToDomainModel(dr.rate)
    )

    const draftRatesOrError = arrayOrFirstError(draftRatesOrErrors)
    if (draftRatesOrError instanceof Error) {
        return draftRatesOrError
    }

    // FIX PARENT ID IF NEEDED
    // This is fragile code. Because of the asymmetry required to break the
    // draftRate/draftContract type-loop, we don't have the data required to
    // set parent id for a draft when parsing it. We fix it here.
    for (const draftRate of draftRatesOrError) {
        if (draftRate.parentContractID === DRAFT_PARENT_PLACEHOLDER) {
            draftRate.parentContractID = contractWithoutRates.id
        }
    }

    return {
        ...contractWithoutRates,
        draftRates: draftRatesOrError,
    }
}

export {
    parseContractWithHistory,
    contractRevisionToDomainModel,
    contractWithHistoryToDomainModel,
    contractWithHistoryToDomainModelWithoutRates,
    arrayOrFirstError,
}
