import { findRateWithHistory } from './findRateWithHistory'
import type { UpdateInfoType } from '../../domain-models'
import type { PrismaClient } from '@prisma/client'
import type { RateType } from '../../domain-models/contractAndRates'
import { includeLatestSubmittedRateRev } from './prismaSubmittedContractHelpers'
import { NotFoundError } from '../storeError'

type SubmitRateArgsType = {
    rateID?: string
    rateRevisionID?: string
    submittedByUserID: UpdateInfoType['updatedBy']
    submitReason: UpdateInfoType['updatedReason']
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
            const { rateID, rateRevisionID, submittedByUserID, submitReason } =
                args

            // this is a hack that should not outlive protobuf. Protobufs only have
            // rate revision IDs in them, so we allow submitting by rate revisionID from our submitHPP resolver
            if (!rateID && !rateRevisionID) {
                return new Error(
                    'Either rateID or rateRevisionID must be supplied. both are blank'
                )
            }

            const findWhere = rateRevisionID
                ? {
                      id: rateRevisionID,
                      submitInfoID: null,
                  }
                : {
                      rateID,
                      submitInfoID: null,
                  }

            // Find current rate revision with related contract
            // query only the submitted revisions on the associated contracts
            const currentRev = await tx.rateRevisionTable.findFirst({
                where: findWhere,
                include: {
                    draftContracts: {
                        include: includeLatestSubmittedRateRev,
                    },
                },
            })
            if (!currentRev) {
                const err = `PRISMA ERROR: Cannot find the current rev to submit with rate id: ${rateID}`
                console.error(err)
                return new NotFoundError(err)
            }

            // Given related contracts, confirm contracts valid by submitted by checking for revisions
            // If related contracts have no initial revision, we know that link is invalid and can throw error
            const relatedContractRevs = currentRev.draftContracts.map(
                (c) => c.revisions[0]
            )
            const everyRelatedContractIsSubmitted = relatedContractRevs.every(
                (rev) => rev !== undefined
            )
            if (!everyRelatedContractIsSubmitted) {
                const message =
                    'Attempted to submit a rate related to a contract that has not been submitted'
                console.error(message)
                return new Error(message)
            }

            const updated = await tx.rateRevisionTable.update({
                where: {
                    id: currentRev.id,
                },
                data: {
                    submitInfo: {
                        create: {
                            updatedAt: currentDateTime,
                            updatedByID: submittedByUserID,
                            updatedReason: submitReason,
                        },
                    },
                    contractRevisions: {
                        createMany: {
                            data: relatedContractRevs.map((rev) => ({
                                contractRevisionID: rev.id,
                                validAfter: currentDateTime,
                            })),
                        },
                    },
                },
                include: {
                    contractRevisions: {
                        include: {
                            contractRevision: true,
                        },
                    },
                },
            })

            // oldRev is the previously submitted revision of this rate (the one just superseded by the update)
            // on an initial submission, there won't be an oldRev
            const oldRev = await tx.rateRevisionTable.findFirst({
                where: {
                    rateID: updated.rateID,
                    NOT: {
                        id: updated.id,
                    },
                },
                include: {
                    contractRevisions: {
                        include: {
                            contractRevision: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            })

            // invalidate all joins on the old revision
            if (oldRev) {
                // if any of the old rev's related contracts aren't in the new Rates, add an entry for that removal
                const oldContractRevs = oldRev.contractRevisions
                    .filter((crevjoin) => !crevjoin.validUntil)
                    .map((crevjoin) => crevjoin.contractRevision)
                const removedContractRevs = oldContractRevs.filter(
                    (crev) =>
                        !currentRev.draftContracts
                            .map((c) => c.id)
                            .includes(crev.contractID)
                )

                if (removedContractRevs.length > 0) {
                    await tx.rateRevisionsOnContractRevisionsTable.createMany({
                        data: removedContractRevs.map((crev) => ({
                            rateRevisionID: updated.id,
                            contractRevisionID: crev.id,
                            validAfter: currentDateTime,
                            validUntil: currentDateTime,
                            isRemoval: true,
                        })),
                    })
                }

                // Invalidate old revision join table links by updating validUntil
                // these links are considered outdated going forward
                await tx.rateRevisionsOnContractRevisionsTable.updateMany({
                    where: {
                        rateRevisionID: oldRev.id,
                        validUntil: null,
                    },
                    data: {
                        validUntil: currentDateTime,
                    },
                })
            }

            return findRateWithHistory(tx, updated.rateID)
        })
    } catch (err) {
        console.error('Prisma error submitting rate', err)
        return err
    }
}

export { submitRate }
export type { SubmitRateArgsType }
