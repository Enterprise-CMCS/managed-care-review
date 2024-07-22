import { type PrismaClient } from '@prisma/client'
import {
    type UpdateDraftContractRatesArgsType,
    updateDraftContractRatesInsideTransaction,
} from './updateDraftContractRates'
import { type NotFoundError } from '../postgresErrors'
import {
    type UnlockContractArgsType,
    unlockContractInsideTransaction,
} from './unlockContract'
import { type ContractType } from '../../domain-models'
import {
    type WithdrawDateArgsType,
    withdrawRateInsideTransaction,
} from './withdrawRate'
import {
    type SubmitContractArgsType,
    submitContractInsideTransaction,
} from './submitContract'

/**
 * replaceRateOnContract
 * @param client
 * @param args
 * @returns contract with updated rates
 *
 * unlock, edit, and resubmit contract to unlink a withdrawn rate and use replacement rate instead
 * finally updates withdrawn rate status
 * the same update reason is used in all logging (both on the contract unlock/submit info and the rate unlock/submit/withdrawn info)
 */

type ReplaceRateOnContractArgsType = {
    contractID: string
    withdrawnRateID: string
    replacementRateID: string
    updateByUserID: string
    updateReason: string
}

async function replaceRateOnContract(
    client: PrismaClient,
    args: ReplaceRateOnContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    const {
        contractID,
        updateByUserID,
        updateReason,
        withdrawnRateID,
        replacementRateID,
    } = args

    try {
        return await client.$transaction(async (tx) => {
            // unlock contract and rates
            const unlockContractArgs: UnlockContractArgsType = {
                contractID,
                unlockedByUserID: updateByUserID,
                unlockReason: updateReason,
            }
            const unlockResult = await unlockContractInsideTransaction(
                tx,
                unlockContractArgs
            )
            if (unlockResult instanceof Error) {
                throw unlockResult
            }

            // update contract - unlink withdrawn child rate and use replacement instead
            const previousRates = unlockResult.draftRates
            const withdrawnRatePosition = previousRates
                .map((rate) => rate.id)
                .indexOf(withdrawnRateID)
            const updateContractRatesArgs: UpdateDraftContractRatesArgsType = {
                contractID,
                rateUpdates: {
                    create: [],
                    update: [],
                    delete: [],
                    unlink: [
                        {
                            rateID: withdrawnRateID,
                        },
                    ],
                    link: [
                        {
                            rateID: replacementRateID,
                            ratePosition: withdrawnRatePosition, // put the linked rate in the same place the withdrawn rate was
                        },
                    ],
                },
            }
            const updateResult =
                await updateDraftContractRatesInsideTransaction(
                    tx,
                    updateContractRatesArgs
                )
            if (updateResult instanceof Error) {
                throw updateResult
            }

            // resubmit contract
            const resubmitContractArgs: SubmitContractArgsType = {
                contractID,
                submittedByUserID: updateByUserID,
                submittedReason: updateReason,
            }
            const resubmitResult = await submitContractInsideTransaction(
                tx,
                resubmitContractArgs
            )
            if (resubmitResult instanceof Error) {
                throw resubmitResult
            }

            // finalize withdraw rate on the child rate we just removed from the contract
            const withdrawRateArgs: WithdrawDateArgsType = {
                rateID: withdrawnRateID,
                withdrawnByUserID: updateByUserID,
                withdrawReason: updateReason,
            }
            const withdrawResult = await withdrawRateInsideTransaction(
                tx,
                withdrawRateArgs
            )
            if (withdrawResult instanceof Error) {
                throw withdrawResult
            }
            return updateResult
        })
    } catch (err) {
        console.error('UNLOCK PRISMA CONTRACT ERR', err)
        return err
    }
}

export { replaceRateOnContract }
export type { ReplaceRateOnContractArgsType }
