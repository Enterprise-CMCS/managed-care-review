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

async function submitRateInsideTransaction(
    tx: PrismaTransactionType,
    args: SubmitRateArgsType
) {
    const currentDateTime = new Date()
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
    // If related contracts have no initial revision, we know that link is invalid and can throw error
    const draftContracts = currentRate.draftContracts

    if (draftContracts) {
        const everyRelatedContractIsSubmitted = draftContracts.every(
            (contract) => contract.revisions.length > 0
        )
        if (!everyRelatedContractIsSubmitted) {
            const message =
                'Attempted to submit a rate related to a contract that has not been submitted'
            console.error(message)
            return new Error(message)
        }
    }

    // update the rate with form data changes except for link/unlinking contracts.
    if (formData) {
        const updatedDraftRate = await updateDraftRate(tx, {
            rateID: rateID,
            formData,
            contractIDs: draftContracts?.map((c) => c.id) || [],
        })

        if (updatedDraftRate instanceof Error) {
            return updatedDraftRate
        }
    }

    // update rate with submit info, remove connected between rateRevision and contract, and making entries
    // for rate and contract revisions on the RateRevisionsOnContractRevisionsTable.
    const updated = await tx.rateRevisionTable.update({
        where: {
            id: currentRev.id,
        },
        data: {
            submitInfo: {
                create: {
                    updatedAt: currentDateTime,
                    updatedByID: submittedByUserID,
                    updatedReason: submittedReason,
                },
            },
        },
    })

    // clean up old data -- TODO figure out which code from submitContract is relevant here (linking/delinking contract and rates not at play)

    return findRateWithHistory(tx, updated.rateID)
}

type SubmitRateArgsType = {
    rateID: string
    formData?: RateFormEditableType
    submittedByUserID: UpdateInfoType['updatedBy']
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
