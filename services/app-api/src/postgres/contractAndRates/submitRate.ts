import { findRateWithHistory } from './findRateWithHistory'
import { updateDraftRate } from './updateDraftRate'
import type { UpdateInfoType } from '../../domain-models'
import type { PrismaClient } from '@prisma/client'
import type {
    RateFormEditableType,
    RateType,
} from '../../domain-models/contractAndRates'
import { NotFoundError } from '../postgresErrors'
import type { PrismaTransactionType } from '../prismaTypes'
import { submitContractAndOrRates } from './submitContractAndOrRates'

async function submitRateInsideTransaction(
    tx: PrismaTransactionType,
    args: SubmitRateArgsType
) {
    const { rateID, submittedByUserID, formData } = args

    const submittedReason = args.submittedReason ?? 'Initial submission' // all subsequent submissions will have a submit reason due to unlock submit modal

    // Find current rate revision with related contract
    // query only the submitted revisions on the associated contracts
    const currentRate = await findRateWithHistory(tx, rateID)
    if (currentRate instanceof Error) {
        const err = `PRISMA ERROR: Cannot find the current rate to submit with rate id: ${rateID}`
        console.error(err)
        return new NotFoundError(err)
    }

    if (currentRate.packageSubmissions.length === 0) {
        const msg =
            'Attempted to submit a rate that was never submitted with a contract.'
        console.error(msg)
        return new Error(msg)
    }

    // find the current rate with related contracts
    const currentRev = await tx.rateRevisionTable.findFirst({
        where: {
            rateID,
            submitInfoID: null,
        },
    })

    if (!currentRev) {
        const err = `PRISMA ERROR: Cannot find the current rev to submit with rate id: ${rateID}`
        console.error(err)
        return new NotFoundError(err)
    }

    // Given related contracts, confirm contracts valid by submitted by checking for revisions
    const draftContracts = currentRate.draftContracts

    // only memorialize submitted contracts. An unsubmitted contract is not a real connection yet.
    const submittedContractIDs =
        draftContracts
            ?.filter((c) => c.revisions.length > 0)
            .map((c) => c.id) || []

    // update the rate with form data changes except for link/unlinking contracts.
    if (formData) {
        const updatedDraftRate = await updateDraftRate(tx, {
            rateID: rateID,
            formData,
            contractIDs: submittedContractIDs,
        })

        if (updatedDraftRate instanceof Error) {
            return updatedDraftRate
        }
    }

    // Now we call the big ol' sumitter to set all the related submissions etc.

    const submitResult = await submitContractAndOrRates(
        tx,
        undefined,
        [rateID],
        submittedByUserID,
        submittedReason
    )
    if (submitResult instanceof Error) {
        return submitResult
    }

    return findRateWithHistory(tx, rateID)
}

type SubmitRateArgsType = {
    rateID: string
    formData?: RateFormEditableType
    submittedByUserID: string
    submittedReason: UpdateInfoType['updatedReason']
}

// Update the given revision
// * invalidate relationships of previous revision
// * set the UpdateInfo
async function submitRate(
    client: PrismaClient,
    args: SubmitRateArgsType
): Promise<RateType | NotFoundError | Error> {
    try {
        return await client.$transaction(async (tx) => {
            const result = await submitRateInsideTransaction(tx, args)
            if (result instanceof Error) {
                throw result
            }
            return result
        })
    } catch (err) {
        console.error('Prisma error submitting rate', err)
        return err
    }
}

export { submitRate }
export type { SubmitRateArgsType }
