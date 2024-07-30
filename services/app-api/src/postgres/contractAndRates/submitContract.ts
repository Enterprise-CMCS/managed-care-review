import type { PrismaClient } from '@prisma/client'
import type { ContractType } from '../../domain-models/contractAndRates'
import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { UpdateInfoType } from '../../domain-models'
import type { PrismaTransactionType } from '../prismaTypes'
import { submitContractAndOrRates } from './submitContractAndOrRates'

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

type SubmitContractArgsType = {
    contractID: string // revision ID
    submittedByUserID: UpdateInfoType['updatedBy']
    submittedReason: UpdateInfoType['updatedReason']
}
// Update the given revision
// * invalidate relationships of previous revision by marking as outdated
// * set the UpdateInfo
async function submitContract(
    client: PrismaClient,
    args: SubmitContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    const { contractID, submittedByUserID, submittedReason } = args

    try {
        return await client.$transaction(async (tx) => {
            const result = submitContractInsideTransaction(tx, {
                contractID,
                submittedByUserID,
                submittedReason,
            })
            if (result instanceof Error) {
                // if we get an error here, we need to throw it to kill the transaction.
                // then we catch it and return it as normal.
                throw result
            }
            return result
        })
    } catch (err) {
        console.error('Submit Prisma Error: ', err)
        return err
    }
}

export { submitContract, submitContractInsideTransaction }

export type { SubmitContractArgsType }
