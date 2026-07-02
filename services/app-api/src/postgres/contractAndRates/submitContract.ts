import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { UpdateInfoType, ContractType } from '../../domain-models'
import type { PrismaTransactionType } from '../prismaTypes'
import { submitContractAndOrRates } from './submitContractAndOrRates'
import type { ExtendedPrismaClient } from '../prismaClient'
import {
    eqroValidationAndReviewDetermination,
    healthPlanReviewDetermination,
} from '@mc-review/submissions'
import { runTransactionWithRowLock } from '../prismaHelpers'

async function submitContractInsideTransaction(
    tx: PrismaTransactionType,
    args: SubmitContractArgsType
): Promise<ContractType | Error> {
    const { contractID, submittedByUserID, submittedReason } = args
    // New C+R code pre-submit
    const currentContract = await findContractWithHistory(tx, contractID)
    if (currentContract instanceof Error) {
        return currentContract
    }

    if (!currentContract.draftRevision || !currentContract.draftRates) {
        return new Error(
            'Attempting to submit a contract that has no draft data'
        )
    }

    // find the current contract with related rates
    const currentRev = await tx.contractRevisionTable.findFirst({
        where: {
            contractID: contractID,
            submitInfoID: null,
            undoUnlockInfoID: null,
        },
    })

    if (!currentRev) {
        return new NotFoundError(
            `PRISMA ERROR: Cannot find the current rev to submit with contract id: ${contractID}`
        )
    }

    const unsubmittedChildRevs = []
    const linkedRateRevs = []
    for (const rate of currentContract.draftRates) {
        if (rate.parentContractID === contractID) {
            if (rate.draftRevision) {
                unsubmittedChildRevs.push(rate.draftRevision)
            } else {
                console.info(
                    'Strange, a child rate is not in a draft state. Shouldnt be true while we are unlocking child rates with contracts.'
                )
                const latestSubmittedRate = rate.revisions[0]
                if (!latestSubmittedRate) {
                    return new Error(
                        `Attempted to submit a contract connected to an unsubmitted child-rate. ContractID: ${contractID}`
                    )
                }
                linkedRateRevs.push(latestSubmittedRate)
            }
        } else {
            // non-child rate
            const latestSubmittedRate = rate.revisions[0]
            if (!latestSubmittedRate) {
                return new Error(
                    `Attempted to submit a contract connected to an unsubmitted non-child-rate. ContractID: ${contractID}`
                )
            }
            linkedRateRevs.push(latestSubmittedRate)
        }
    }

    const submissionResult = await submitContractAndOrRates(
        tx,
        contractID,
        unsubmittedChildRevs.map((r) => r.rateID),
        submittedByUserID,
        submittedReason
    )
    if (submissionResult instanceof Error) {
        throw submissionResult
    }

    return await findContractWithHistory(tx, contractID)
}

async function eqroContractReviewDeterminationAction(
    tx: PrismaTransactionType,
    contract: ContractType
): Promise<ContractType | Error> {
    if (contract.contractSubmissionType !== 'EQRO') {
        return new Error('Cannot determine review on non-EQRO contracts')
    }

    const canDetermineReview =
        ['SUBMITTED', 'RESUBMITTED'].includes(contract.status) &&
        !['APPROVED', 'WITHDRAWN'].includes(contract.reviewStatus)

    if (!canDetermineReview) {
        return new Error(
            `Cannot determine review on contract with status ${contract.consolidatedStatus}`
        )
    }

    const latestSubmission = contract.packageSubmissions[0]
    if (!latestSubmission) {
        return new Error(
            'Cannot determine review: contract has no submitted revision'
        )
    }

    const reviewDetermination = eqroValidationAndReviewDetermination(
        contract.id,
        latestSubmission.contractRevision.formData
    )

    if (reviewDetermination instanceof Error) {
        return reviewDetermination
    }

    const reviewAction = await tx.contractActionTable.create({
        data: {
            updatedByID: undefined,
            actionType: reviewDetermination
                ? 'UNDER_REVIEW'
                : 'NOT_SUBJECT_TO_REVIEW',
            contractID: contract.id,
        },
    })

    // Review determination is created after the submit event and becomes the
    // latest visible action for this contract.
    await tx.contractTable.update({
        where: {
            id: contract.id,
        },
        data: {
            lastActionDate: reviewAction.updatedAt,
        },
    })

    const updatedContract = await findContractWithHistory(tx, contract.id)
    if (updatedContract instanceof Error) {
        throw contract
    }

    return updatedContract
}

async function healthPlanContractReviewDeterminationAction(
    tx: PrismaTransactionType,
    contract: ContractType
): Promise<ContractType | Error> {
    if (contract.contractSubmissionType !== 'HEALTH_PLAN') {
        return new Error('Cannot determine review on non-HEALTH_PLAN contracts')
    }

    const canDetermineReview =
        ['SUBMITTED', 'RESUBMITTED'].includes(contract.status) &&
        !['APPROVED', 'WITHDRAWN'].includes(contract.reviewStatus)

    if (!canDetermineReview) {
        return new Error(
            `Cannot determine review on contract with status ${contract.consolidatedStatus}`
        )
    }

    const latestSubmission = contract.packageSubmissions[0]
    if (!latestSubmission) {
        return new Error(
            'Cannot determine review: contract has no submitted revision'
        )
    }

    const subjectToReview = healthPlanReviewDetermination(
        latestSubmission.contractRevision.formData
    )

    const reviewAction = await tx.contractActionTable.create({
        data: {
            updatedByID: undefined,
            actionType: subjectToReview
                ? 'UNDER_REVIEW'
                : 'NOT_SUBJECT_TO_REVIEW',
            contractID: contract.id,
        },
    })

    // Review determination is created after the submit event and becomes the
    // latest visible action for this contract.
    await tx.contractTable.update({
        where: {
            id: contract.id,
        },
        data: {
            lastActionDate: reviewAction.updatedAt,
        },
    })

    const updatedContract = await findContractWithHistory(tx, contract.id)
    if (updatedContract instanceof Error) {
        return updatedContract
    }

    return updatedContract
}

type SubmitContractArgsType = {
    contractID: string // revision ID
    submittedByUserID: string
    submittedReason: UpdateInfoType['updatedReason']
    // Value of the `chip-submission-automation` LaunchDarkly flag, plumbed
    // through from the resolver. Gates HEALTH_PLAN CHIP review determination.
    chipSubmissionAutomationFlag?: boolean
}
// Update the given revision
// * invalidate relationships of previous revision by marking as outdated
// * set the UpdateInfo
async function submitContract(
    client: ExtendedPrismaClient,
    args: SubmitContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    const {
        contractID,
        submittedByUserID,
        submittedReason,
        chipSubmissionAutomationFlag,
    } = args

    return runTransactionWithRowLock({
        client,
        operationName: 'submitContract',
        table: 'ContractTable',
        id: contractID,
        transactionOptions: {
            timeout: 10000,
        },
        transaction: async (tx) => {
            const result = await submitContractInsideTransaction(tx, {
                contractID,
                submittedByUserID,
                submittedReason,
            })

            if (result instanceof Error) {
                // if we get an error here, we need to throw it to kill the transaction.
                // then we catch it and return it as normal.
                throw result
            }

            // If EQRO submission insert review status action for review determination.
            if (result.contractSubmissionType === 'EQRO') {
                const eqroReviewUpdate =
                    await eqroContractReviewDeterminationAction(tx, result)

                if (eqroReviewUpdate instanceof Error) {
                    throw eqroReviewUpdate
                }

                //return updated contract with review action.
                return eqroReviewUpdate
            }

            if (
                chipSubmissionAutomationFlag &&
                result.contractSubmissionType === 'HEALTH_PLAN'
            ) {
                const healthPlanReviewUpdate =
                    await healthPlanContractReviewDeterminationAction(
                        tx,
                        result
                    )

                if (healthPlanReviewUpdate instanceof Error) {
                    throw healthPlanReviewUpdate
                }

                return healthPlanReviewUpdate
            }

            return result
        },
    })
}

export {
    submitContract,
    submitContractInsideTransaction,
    eqroContractReviewDeterminationAction,
    healthPlanContractReviewDeterminationAction,
}

export type { SubmitContractArgsType }
