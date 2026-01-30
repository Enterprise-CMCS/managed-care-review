import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { UpdateInfoType, ContractType } from '../../domain-models'
import type { PrismaTransactionType } from '../prismaTypes'
import { submitContractAndOrRates } from './submitContractAndOrRates'
import type { ExtendedPrismaClient } from '../prismaClient'
import { eqroValidationAndReviewDetermination } from '@mc-review/submissions'

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
        },
    })

    if (!currentRev) {
        const err = `PRISMA ERROR: Cannot find the current rev to submit with contract id: ${contractID}`
        console.error(err)
        return new NotFoundError(err)
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
                    const msg = `Attempted to submit a contract connected to an unsubmitted child-rate. ContractID: ${contractID}`
                    return new Error(msg)
                }
                linkedRateRevs.push(latestSubmittedRate)
            }
        } else {
            // non-child rate
            const latestSubmittedRate = rate.revisions[0]
            if (!latestSubmittedRate) {
                const msg = `Attempted to submit a contract connected to an unsubmitted non-child-rate. ContractID: ${contractID}`
                return new Error(msg)
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
        return submissionResult
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

    if (reviewDetermination) {
        await tx.contractActionTable.create({
            data: {
                updatedByID: undefined,
                actionType: 'UNDER_REVIEW',
                contractID: contract.id,
            },
        })
    } else {
        await tx.contractActionTable.create({
            data: {
                updatedByID: undefined,
                actionType: 'NOT_SUBJECT_TO_REVIEW',
                contractID: contract.id,
            },
        })
    }

    const updatedContract = await findContractWithHistory(tx, contract.id)
    if (updatedContract instanceof Error) {
        throw contract
    }

    return updatedContract
}

type SubmitContractArgsType = {
    contractID: string // revision ID
    submittedByUserID: string
    submittedReason: UpdateInfoType['updatedReason']
}
// Update the given revision
// * invalidate relationships of previous revision by marking as outdated
// * set the UpdateInfo
async function submitContract(
    client: ExtendedPrismaClient,
    args: SubmitContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    const { contractID, submittedByUserID, submittedReason } = args

    try {
        return await client.$transaction(async (tx) => {
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

            return result
        })
    } catch (err) {
        console.error('Submit Prisma Error: ', err)
        return err
    }
}

export {
    submitContract,
    submitContractInsideTransaction,
    eqroContractReviewDeterminationAction,
}

export type { SubmitContractArgsType }
