import { findRateWithHistory } from './findRateWithHistory'
import { updateDraftRate } from './updateDraftRate'
import type { UpdateInfoType } from '../../domain-models'
import type { PrismaClient } from '@prisma/client'
import type {
    RateFormEditableType,
    RateType,
} from '../../domain-models/contractAndRates'
import { NotFoundError } from '../postgresErrors'

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
    const currentDateTime = new Date()

    try {
        return await client.$transaction(async (tx) => {
            const { rateID, submittedByUserID, formData } = args

            const submittedReason = args.submittedReason ?? 'Initial submission' // all subsequent submissions will have a submit reason due to unlock submit modal

            const currentRate = await findRateWithHistory(tx, rateID)
            if (currentRate instanceof Error) {
                return currentRate
            }

            if (!currentRate.draftRevision) {
                return new Error(
                    'Attempting to submit a contract that has no draft data'
                )
            }

            // find the current rate with related contracts
            const currentRev = await client.rateRevisionTable.findFirst({
                where: {
                    rateID,
                    submitInfoID: null,
                },
            })

            if (!currentRev) {
                const err = `PRISMA ERROR: Cannot find the current rev to submit with contract id: ${rateID}`
                console.error(err)
                return new NotFoundError(err)
            }

            // Given related contracts, confirm contracts valid by submitted by checking for revisions
            // If related contracts have no initial revision, we know that link is invalid and can throw error
            const relatedContracts = currentRate.revisions[0].contractRevisions
            // need to get full contract
            const everyRelatedContractIsSubmitted = relatedContracts.every(
                // eventually needs to be packageSubimssions approach
                (contractRev) => contractRev.submitInfo !== undefined
            )
            if (!everyRelatedContractIsSubmitted) {
                const message =
                    'Attempted to submit a rate related to a contract that has not been submitted'
                console.error(message)
                return new Error(message)
            }

            // update the rate with form data changes except for link/unlinking contracts.
            if (formData) {
                const updatedDraftRate = await updateDraftRate(tx, {
                    rateID: rateID,
                    formData,
                    contractIDs: relatedContracts.map((cr) => cr.contract.id),
                })

                if (updatedDraftRate instanceof Error) {
                    return updatedDraftRate
                }
            }

            // update rate with submit info, remove connected between rateRevision and contract, and making entries
            // for rate and contract revisions on the RateRevisionsOnContractRevisionsTable.
            const updated = await tx.rateRevisionTable.update({
                where: {
                    id: rateID,
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
        })
    } catch (err) {
        console.error('Prisma error submitting rate', err)
        return err
    }
}

export { submitRate }
export type { SubmitRateArgsType }
