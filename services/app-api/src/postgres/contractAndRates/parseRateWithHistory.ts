import type {
    RateType,
    RateRevisionType,
    StrippedRateType,
    StrippedRateRevisionType,
    ContractPackageSubmissionType,
    RatePackageSubmissionType,
} from '../../domain-models'
import { rateSchema } from '../../domain-models/contractAndRates'
import type { RateWithoutDraftContractsType } from '../../domain-models/contractAndRates/baseContractRateTypes'
import {
    arrayOrFirstError,
    contractWithHistoryToDomainModelWithoutRates,
    contractRevisionToDomainModel,
} from './parseContractWithHistory'
import type {
    RateRevisionTableWithFormData,
    StrippedRateRevisionTableWithFormData,
} from './prismaSharedContractRateHelpers'
import {
    convertUpdateInfoToDomainModel,
    getConsolidatedRateStatus,
    getContractRateStatus,
    getRateReviewStatus,
    rateFormDataToDomainModel,
    getParentContractID,
    DRAFT_PARENT_PLACEHOLDER,
} from './prismaSharedContractRateHelpers'
import type {
    RateTableWithoutDraftContractsPayload,
    RateTableWithoutDraftContractsStrippedPayload,
} from './prismaSubmittedRateHelpers'
import type {
    RateTableFullPayload,
    RateTableStrippedPayload,
} from './prismaFullContractRateHelpers'
import type { RateDataOverrideType } from '../../domain-models/contractAndRates/contractRateOverrideTypes'

function parseRateWithHistory(
    rate: RateTableFullPayload,
    useZod: boolean = true
): RateType | Error {
    const rateWithHistory = rateWithHistoryToDomainModel(rate)

    if (rateWithHistory instanceof Error) {
        console.warn(
            `ERROR: attempting to parse prisma rate with history failed: ${rateWithHistory.message}`
        )
        return rateWithHistory
    }

    // useZod flag allows us to skip parsing in parts of the code
    // where converting to the domain model is enough
    // such as when calling indexContract and indexRates
    if (useZod) {
        const parseRate = rateSchema.safeParse(rateWithHistory)

        if (!parseRate.success) {
            const error = `ERROR: attempting to parse prisma contract with history failed: ${parseRate.error}`
            console.warn(error)
            return parseRate.error
        }

        return parseRate.data
    } else {
        return rateWithHistory
    }
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

function rateOverridesToDomainModel(
    rateOverrides: RateTableWithoutDraftContractsPayload['rateOverrides']
): RateDataOverrideType[] {
    return rateOverrides
        .map((override) => ({
            id: override.id,
            createdAt: override.createdAt ?? undefined,
            updatedBy: override.updatedBy
                ? {
                      id: override.updatedBy.id,
                      role: override.updatedBy.role,
                      email: override.updatedBy.email,
                      givenName: override.updatedBy.givenName,
                      familyName: override.updatedBy.familyName,
                  }
                : undefined,
            description: override.description,
            overrides: {
                initiallySubmittedAt:
                    override.initiallySubmittedAt ?? undefined,
            },
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// rateWithoutDraftContractsToDomainModel constructs a history for this particular contract including changes to all of its
// revisions and all related rate revisions, including added and removed rates, but eliding any draft contracts to break the recursion chain
function rateWithoutDraftContractsToDomainModel(
    rate: RateTableWithoutDraftContractsPayload
): RateWithoutDraftContractsType | Error {
    // so you get all the rate revisions. each one has a bunch of contracts
    // each set of contracts gets its own "revision" in the return list
    // further rateRevs naturally are their own "revision"
    const rateRevisions = [...rate.revisions].sort(
        (revA, revB) => revA.createdAt.getTime() - revB.createdAt.getTime()
    )

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
                submitedRevs.push(rateRev)
            }

            const relatedContractRevisions = submission.submissionPackages
                .filter((p) => p.rateRevisionID === revision.id)
                .sort(
                    (a, b) =>
                        a.contractRevision.createdAt.getTime() -
                        b.contractRevision.createdAt.getTime()
                )
                .map((p) => p.contractRevision)

            const rateRevision = rateRevisionToDomainModel(revision)

            const contractRevisions = relatedContractRevisions.map((c) =>
                contractRevisionToDomainModel(c)
            )

            packageSubmissions.push({
                submitInfo: {
                    updatedAt: submission.updatedAt,
                    updatedBy: submission.updatedBy,
                    updatedReason: submission.updatedReason,
                },
                submittedRevisions: submitedRevs,
                rateRevision,
                contractRevisions,
            })
        }
    }

    const parentContractID = getParentContractID(rateRevisions)

    if (parentContractID instanceof Error) {
        return parentContractID
    }

    const status = getContractRateStatus(rateRevisions)
    const reviewStatus = getRateReviewStatus(rate)
    const consolidatedStatus = getConsolidatedRateStatus(status, reviewStatus)

    return {
        id: rate.id,
        createdAt: rate.createdAt,
        updatedAt: rate.updatedAt,
        status,
        reviewStatus,
        consolidatedStatus,
        stateCode: rate.stateCode,
        parentContractID: parentContractID,
        stateNumber: rate.stateNumber,
        draftRevision,
        revisions: submittedRevisions.reverse(),
        packageSubmissions: packageSubmissions.reverse(),
        reviewStatusActions: rate.reviewStatusActions.reverse(),
        rateOverrides: rateOverridesToDomainModel(rate.rateOverrides),
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

    const withdrawnFromContractsOrErrors = rate.withdrawnFromContracts.map(
        (contract) =>
            contractWithHistoryToDomainModelWithoutRates(contract.contract)
    )

    const withdrawnFromContractsOrError = arrayOrFirstError(
        withdrawnFromContractsOrErrors
    )
    if (withdrawnFromContractsOrError instanceof Error) {
        return withdrawnFromContractsOrError
    }

    if (
        rateWithoutContracts.status === 'SUBMITTED' ||
        rateWithoutContracts.status === 'RESUBMITTED'
    ) {
        return {
            ...rateWithoutContracts,
            withdrawnFromContracts: withdrawnFromContractsOrError,
        }
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
            const msg = `programming error: its an unsubmitted rate with ${draftContractsOrError.length} draft contracts`
            console.error(msg)
            return new Error(msg)
        }
        const draftContract = draftContractsOrError[0]
        rateWithoutContracts.parentContractID = draftContract.id
    }

    return {
        ...rateWithoutContracts,
        withdrawnFromContracts: withdrawnFromContractsOrError,
        draftContracts: draftContractsOrError,
    }
}

function strippedRateRevisionToDomainModel(
    revision: StrippedRateRevisionTableWithFormData
): StrippedRateRevisionType {
    const formData = {
        id: revision.rateID,
        rateID: revision.rateID,
        rateType: revision.rateType ?? undefined,
        rateCapitationType: revision.rateCapitationType ?? undefined,
        rateDateStart: revision.rateDateStart ?? undefined,
        rateDateEnd: revision.rateDateEnd ?? undefined,
        rateDateCertified: revision.rateDateCertified ?? undefined,
        amendmentEffectiveDateStart:
            revision.amendmentEffectiveDateStart ?? undefined,
        amendmentEffectiveDateEnd:
            revision.amendmentEffectiveDateEnd ?? undefined,
        rateProgramIDs: revision.rateProgramIDs,
        rateMedicaidPopulations: revision.rateMedicaidPopulations,
        deprecatedRateProgramIDs: revision.deprecatedRateProgramIDs,
        rateCertificationName: revision.rateCertificationName ?? undefined,
    }

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

function strippedRateWithoutDraftContractsToDomainModel(
    rate: RateTableWithoutDraftContractsStrippedPayload
): StrippedRateType | Error {
    // so you get all the rate revisions. each one has a bunch of contracts
    // each set of contracts gets its own "revision" in the return list
    // further rateRevs naturally are their own "revision"
    const rateRevisions = [...rate.revisions].sort(
        (revA, revB) => revA.createdAt.getTime() - revB.createdAt.getTime()
    )

    let draftRevision: RateRevisionType | undefined = undefined
    const submittedRevisions: RateRevisionType[] = []
    for (const rateRev of rateRevisions) {
        // set draft revision aside from submitted revisions.
        if (!rateRev.submitInfo) {
            if (draftRevision) {
                return new Error(
                    'PROGRAMMING ERROR: a rate may not have multiple drafts simultaneously. ID: ' +
                        rate.id
                )
            }
            draftRevision = strippedRateRevisionToDomainModel(rateRev)
            continue
        }

        submittedRevisions.push(strippedRateRevisionToDomainModel(rateRev))
    }

    const parentContractID = getParentContractID(rateRevisions)

    if (parentContractID instanceof Error) {
        return parentContractID
    }

    const status = getContractRateStatus(rateRevisions)
    const reviewStatus = getRateReviewStatus(rate)
    const consolidatedStatus = getConsolidatedRateStatus(status, reviewStatus)

    const submittedRevisionsDescending = submittedRevisions.reverse()

    const latestOverride = rateOverridesToDomainModel(rate.rateOverrides)[0]

    // Use override or calculate initial rate submission.
    const initiallySubmittedAt =
        latestOverride?.overrides.initiallySubmittedAt ||
        submittedRevisionsDescending[submittedRevisionsDescending.length - 1]
            .submitInfo?.updatedAt

    return {
        id: rate.id,
        createdAt: rate.createdAt,
        updatedAt: rate.updatedAt,
        initiallySubmittedAt,
        status,
        reviewStatus,
        consolidatedStatus,
        stateCode: rate.stateCode,
        parentContractID: parentContractID,
        stateNumber: rate.stateNumber,
        draftRevision,
        latestSubmittedRevision: submittedRevisionsDescending[0],
        reviewStatusActions: rate.reviewStatusActions.reverse(),
    }
}

// strippedRateToDomainModel constructs a stripped down version of a rate.
function strippedRateToDomainModel(
    rate: RateTableStrippedPayload
): StrippedRateType | Error {
    const rateWithoutContracts =
        strippedRateWithoutDraftContractsToDomainModel(rate)

    if (rateWithoutContracts instanceof Error) {
        return rateWithoutContracts
    }

    // FIX PARENT ID IF NEEDED
    // This is fragile code. Because of the asymmetry required to break the
    // draftRate/draftContract type-loop, we don't have the data required to
    // set parent id for a draft when parsing it. We fix it here.
    if (rateWithoutContracts.parentContractID === DRAFT_PARENT_PLACEHOLDER) {
        if (rate.draftContracts.length !== 1) {
            const msg = `programming error: its an unsubmitted rate with ${rate.draftContracts.length} draft contracts`
            console.error(msg)
            return new Error(msg)
        }
        const draftContract = rate.draftContracts[0]
        rateWithoutContracts.parentContractID = draftContract.contractID
    }

    return rateWithoutContracts
}

function parseStrippedRateWithHistory(
    rate: RateTableStrippedPayload
): StrippedRateType | Error {
    const strippedRate = strippedRateToDomainModel(rate)

    if (strippedRate instanceof Error) {
        console.warn(
            `ERROR: attempting to parse prisma rate with history failed: ${strippedRate.message}`
        )
        return strippedRate
    }

    return strippedRate
}

export {
    parseRateWithHistory,
    rateRevisionToDomainModel,
    rateWithHistoryToDomainModel,
    rateWithoutDraftContractsToDomainModel,
    parseStrippedRateWithHistory,
    strippedRateToDomainModel,
    strippedRateWithoutDraftContractsToDomainModel,
    strippedRateRevisionToDomainModel,
}
