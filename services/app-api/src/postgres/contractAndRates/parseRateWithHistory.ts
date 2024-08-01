import type {
    RateType,
    RateRevisionType,
} from '../../domain-models/contractAndRates'
import { rateSchema } from '../../domain-models/contractAndRates'
import type {
    ContractPackageSubmissionType,
    RatePackageSubmissionType,
} from '../../domain-models/contractAndRates/packageSubmissions'
import type { RateWithoutDraftContractsType } from '../../domain-models/contractAndRates/baseContractRateTypes'
import {
    arrayOrFirstError,
    contractWithHistoryToDomainModelWithoutRates,
    contractRevisionToDomainModel,
} from './parseContractWithHistory'
import type { RateRevisionTableWithFormData } from './prismaSharedContractRateHelpers'
import {
    convertUpdateInfoToDomainModel,
    getContractRateStatus,
    rateFormDataToDomainModel,
} from './prismaSharedContractRateHelpers'
import type { RateTableWithoutDraftContractsPayload } from './prismaSubmittedRateHelpers'
import type { RateTableFullPayload } from './prismaFullContractRateHelpers'

function parseRateWithHistory(rate: RateTableFullPayload): RateType | Error {
    const rateWithHistory = rateWithHistoryToDomainModel(rate)

    if (rateWithHistory instanceof Error) {
        console.warn(
            `ERROR: attempting to parse prisma rate with history failed: ${rateWithHistory.message}`
        )
        return rateWithHistory
    }

    const parseRate = rateSchema.safeParse(rateWithHistory)

    if (!parseRate.success) {
        const error = `ERROR: attempting to parse prisma contract with history failed: ${parseRate.error}`
        console.warn(error)
        return parseRate.error
    }

    return parseRate.data
}

function rateRevisionToDomainModel(
    revision: RateRevisionTableWithFormData
): RateRevisionType {
    const formData = rateFormDataToDomainModel(revision)

    return {
        id: revision.id,
        rateID: revision.rateID,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        submitInfo: convertUpdateInfoToDomainModel(revision.submitInfo),
        unlockInfo: convertUpdateInfoToDomainModel(revision.unlockInfo),
        formData,
    }
}

const DRAFT_PARENT_PLACEHOLDER = 'DRAFT_PARENT_REPLACE_ME'

// rateWithoutDraftContractsToDomainModel constructs a history for this particular contract including changes to all of its
// revisions and all related rate revisions, including added and removed rates, but eliding any draft contracts to break the recursion chain
function rateWithoutDraftContractsToDomainModel(
    rate: RateTableWithoutDraftContractsPayload
): RateWithoutDraftContractsType | Error {
    // so you get all the rate revisions. each one has a bunch of contracts
    // each set of contracts gets its own "revision" in the return list
    // further rateRevs naturally are their own "revision"
    const rateRevisions = rate.revisions

    let draftRevision: RateRevisionType | undefined = undefined
    const submittedRevisions: RateRevisionType[] = []
    for (const rateRev of rateRevisions) {
        // If we have a draft revision
        // We set the draft revision aside, format it properly
        if (!rateRev.submitInfo) {
            if (draftRevision) {
                return new Error(
                    'PROGRAMMING ERROR: a rate may not have multiple drafts simultaneously. ID: ' +
                        rate.id
                )
            }

            draftRevision = rateRevisionToDomainModel(rateRev)

            // skip the rest of the processing
            continue
        }

        submittedRevisions.push(rateRevisionToDomainModel(rateRev))
    }

    // New C+R package history code
    // Every revision has a set of submissions it was part of.
    const packageSubmissions: RatePackageSubmissionType[] = []
    for (const revision of rate.revisions) {
        for (const submission of revision.relatedSubmissions) {
            // submittedThings
            const submittedContracts = submission.submittedContracts.map((c) =>
                contractRevisionToDomainModel(c)
            )
            const submittedRates = submission.submittedRates.map((r) =>
                rateRevisionToDomainModel(r)
            )

            const submitedRevs: ContractPackageSubmissionType['submittedRevisions'] =
                []
            for (const contractRev of submittedContracts) {
                submitedRevs.push(contractRev)
            }
            for (const rateRev of submittedRates) {
                if (rateRev instanceof Error) {
                    return rateRev
                }
                submitedRevs.push(rateRev)
            }

            const reatedContractRevisions = submission.submissionPackages
                .filter((p) => p.rateRevisionID === revision.id)
                .sort(
                    (a, b) =>
                        a.contractRevision.createdAt.getTime() -
                        b.contractRevision.createdAt.getTime()
                )
                .map((p) => p.contractRevision)

            const rateRevision = rateRevisionToDomainModel(revision)
            if (rateRevision instanceof Error) {
                return rateRevision
            }

            const contractRevisions = reatedContractRevisions.map((c) =>
                contractRevisionToDomainModel(c)
            )

            packageSubmissions.push({
                submitInfo: {
                    updatedAt: submission.updatedAt,
                    updatedBy: submission.updatedBy.email,
                    updatedReason: submission.updatedReason,
                },
                submittedRevisions: submitedRevs,
                rateRevision,
                contractRevisions,
            })
        }
    }

    // Find this rate's parent contract. It'll be the contract it was initially submitted with
    // or the contract it is associated with as an initial draft.
    const firstRevision = rate.revisions[0]
    const submission = firstRevision.submitInfo

    let parentContractID = undefined
    if (!submission) {
        // this is a draft, never submitted, rate
        // this is fragile code
        // because this is a draft, it can only be parented by the single draft contract
        // that created it. But because of the asymmetry required to break the recursive
        // rate-draftContract bit, we don't have access to that here. Put a shibboleth in
        // that can be replaced in higher places.
        parentContractID = DRAFT_PARENT_PLACEHOLDER
    } else {
        // check the initial submission
        if (firstRevision.relatedSubmissions.length == 0) {
            console.info('No related submission. Unmigrated rate.')
            parentContractID = '00000000-1111-2222-3333-444444444444'
        } else {
            if (submission.submittedContracts.length !== 1) {
                const msg =
                    'programming error: its a submitted rate that was not submitted with a contract initially'
                console.error(msg)
                return new Error(msg)
            }
            const firstContract = submission.submittedContracts[0]
            parentContractID = firstContract.contractID
        }
    }

    // TODO: why are we handling this differently from how we're doing dates in parseContractWithHistory
    // handle legacy revisions dateAdded  on documents
    // get references to rate revision in submission order and
    // reset the document dateAdded dates accordingly.
    const firstSeenDate: { [sha: string]: Date } = {}
    for (const rateRev of submittedRevisions) {
        const sinceDate = rateRev.submitInfo?.updatedAt || rateRev.updatedAt
        if (rateRev.formData.rateDocuments) {
            for (const doc of rateRev.formData.rateDocuments) {
                if (!firstSeenDate[doc.sha256]) {
                    firstSeenDate[doc.sha256] = sinceDate
                }
                doc.dateAdded = firstSeenDate[doc.sha256]
            }
        }
        if (rateRev.formData.supportingDocuments) {
            for (const doc of rateRev.formData.supportingDocuments) {
                if (!firstSeenDate[doc.sha256]) {
                    firstSeenDate[doc.sha256] = sinceDate
                }
                doc.dateAdded = firstSeenDate[doc.sha256]
            }
        }
    }

    return {
        id: rate.id,
        createdAt: rate.createdAt,
        updatedAt: rate.updatedAt,
        status: getContractRateStatus(rateRevisions),
        stateCode: rate.stateCode,
        parentContractID: parentContractID,
        withdrawInfo: convertUpdateInfoToDomainModel(rate.withdrawInfo),
        stateNumber: rate.stateNumber,
        draftRevision,
        revisions: submittedRevisions.reverse(),
        packageSubmissions: packageSubmissions.reverse(),
    }
}

// rateWithHistoryToDomainModel constructs a history for this particular contract including changes to all of its
// revisions and all related rate revisions, including added and removed rates
function rateWithHistoryToDomainModel(
    rate: RateTableFullPayload
): RateType | Error {
    const rateWithoutContracts = rateWithoutDraftContractsToDomainModel(rate)

    if (rateWithoutContracts instanceof Error) {
        return rateWithoutContracts
    }

    if (
        rateWithoutContracts.status === 'SUBMITTED' ||
        rateWithoutContracts.status === 'RESUBMITTED'
    ) {
        return rateWithoutContracts
    }

    // since we have a draft revision, we should also hold onto any set draftRates for later
    const draftContractsOrErrors = rate.draftContracts.map((dc) =>
        contractWithHistoryToDomainModelWithoutRates(dc.contract)
    )

    const draftContractsOrError = arrayOrFirstError(draftContractsOrErrors)
    if (draftContractsOrError instanceof Error) {
        return draftContractsOrError
    }

    // FIX PARENT ID IF NEEDED
    // This is fragile code. Because of the asymmetry required to break the
    // draftRate/draftContract type-loop, we don't have the data required to
    // set parent id for a draft when parsing it. We fix it here.
    if (rateWithoutContracts.parentContractID === DRAFT_PARENT_PLACEHOLDER) {
        if (draftContractsOrError.length !== 1) {
            const msg =
                'programming error: its an unsubmitted rate with not one draft contract'
            console.error(msg)
            return new Error(msg)
        }
        const draftContract = draftContractsOrError[0]
        rateWithoutContracts.parentContractID = draftContract.id
    }

    return {
        ...rateWithoutContracts,
        draftContracts: draftContractsOrError,
    }
}

export {
    parseRateWithHistory,
    rateRevisionToDomainModel,
    rateWithHistoryToDomainModel,
    rateWithoutDraftContractsToDomainModel,
    DRAFT_PARENT_PLACEHOLDER,
}
