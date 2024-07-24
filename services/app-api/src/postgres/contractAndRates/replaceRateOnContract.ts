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
import { type PrismaTransactionType } from '../prismaTypes'

/**
 * replaceRateOnContract
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
    replacedByUserID: string
    replaceReason: string
}

async function replaceRateOnContractInsideTransaction(
    tx: PrismaTransactionType,
    args: ReplaceRateOnContractArgsType
): Promise<ContractType | Error> {
    const {
        contractID,
        replacedByUserID,
        replaceReason,
        withdrawnRateID,
        replacementRateID,
    } = args

    // unlock contract and rates
    const unlockContractArgs: UnlockContractArgsType = {
        contractID,
        unlockedByUserID: replacedByUserID,
        unlockReason: replaceReason,
    }
    const unlockResult = await unlockContractInsideTransaction(
        tx,
        unlockContractArgs
    )
    if (unlockResult instanceof Error) {
        return unlockResult
    }

    // prepare to update contract
    const previousRates = unlockResult.draftRates

    const withdrawnRateIndex = previousRates
        .map((rate) => rate.id)
        .indexOf(withdrawnRateID)

    if (withdrawnRateIndex === -1) {
        return new Error(
            'UserInputError: withdrawnRateID does not map to a current rate on this contract'
        )
    }

    if (previousRates[withdrawnRateIndex].parentContractID !== contractID) {
        return new Error(
            'UserInputError: withdrawnRateID points to an already linked rate. Only child rates can be withdrawn.'
        )
    }
    const updateRates: UpdateDraftContractRatesArgsType['rateUpdates']['update'] =
        []
    const linkRates: UpdateDraftContractRatesArgsType['rateUpdates']['link'] =
        []

    previousRates.forEach((rate, idx) => {
        if (rate.id === withdrawnRateID) {
            return // we already know this is swapped, we will swap in replacement later, skip for now
        }
        // keep any existing linked rates besides replacement or withddrawn rate
        if (rate.parentContractID !== contractID) {
            linkRates.push({
                rateID: rate.id,
                ratePosition: idx + 1,
            })
        } else {
            // keep any existing child rates
            updateRates.push({
                rateID: rate.id,
                formData:
                    rate.packageSubmissions[0].contractRevisions[0].formData,
                ratePosition: idx + 1,
            })
        }
    })
    // add in replacement rate with the ratePosition of the withdrawn rate
    linkRates.push({
        rateID: replacementRateID,
        ratePosition: withdrawnRateIndex + 1,
    })

    // arrange data for update draft contract rates
    const updateContractRatesArgs: UpdateDraftContractRatesArgsType = {
        contractID,
        rateUpdates: {
            create: [],
            update: [
                //  keep any already added child rates
                ...updateRates,
            ],
            delete: [],
            unlink: [
                // unlink the withdrawn child rate
                {
                    rateID: withdrawnRateID,
                },
            ],
            link: [
                // link replacement rate and keep any other already added linked rates
                ...linkRates.sort((a, b) => a.ratePosition - b.ratePosition),
            ],
        },
    }

    const updateResult = await updateDraftContractRatesInsideTransaction(
        tx,
        updateContractRatesArgs
    )
    if (updateResult instanceof Error) {
        return updateResult
    }

    // resubmit contract
    const resubmitContractArgs: SubmitContractArgsType = {
        contractID,
        submittedByUserID: replacedByUserID,
        submittedReason: replaceReason,
    }
    const resubmitResult = await submitContractInsideTransaction(
        tx,
        resubmitContractArgs
    )
    if (resubmitResult instanceof Error) {
        return resubmitResult
    }

    // finalize withdraw rate on the child rate we just removed from the contract
    const withdrawRateArgs: WithdrawDateArgsType = {
        rateID: withdrawnRateID,
        withdrawnByUserID: replacedByUserID,
        withdrawReason: replaceReason,
    }
    const withdrawResult = await withdrawRateInsideTransaction(
        tx,
        withdrawRateArgs
    )
    if (withdrawResult instanceof Error) {
        return withdrawResult
    }
    return updateResult
}

async function replaceRateOnContract(
    client: PrismaClient,
    args: ReplaceRateOnContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    const {
        contractID,
        replacedByUserID,
        replaceReason,
        withdrawnRateID,
        replacementRateID,
    } = args

    try {
        return await client.$transaction(async (tx) => {
            const result = replaceRateOnContractInsideTransaction(tx, {
                contractID,
                replacedByUserID,
                replaceReason,
                withdrawnRateID,
                replacementRateID,
            })
            if (result instanceof Error) {
                // if we get an error here, we need to throw it to kill the transaction.
                // then we catch it and return it as normal.
                throw result
            }
            return result
        })
    } catch (err) {
        console.error('Prisma Error: ', err)
        return err
    }
}
export { replaceRateOnContract }
export type { ReplaceRateOnContractArgsType }
