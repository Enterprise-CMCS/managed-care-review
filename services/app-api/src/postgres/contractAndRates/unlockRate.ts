import type { PrismaClient } from '@prisma/client'
import type { RateType } from '../../domain-models/contractAndRates'
import { findRateWithHistory } from './findRateWithHistory'

// Unlock the given rate
// * copy form data
// * set relationships based on last submission
async function unlockRate(
    client: PrismaClient,
    rateID: string,
    unlockedByUserID: string,
    unlockReason: string
): Promise<RateType | Error> {
    const groupTime = new Date()

    try {
        return await client.$transaction(async (tx) => {
            // Given all the Rates associated with this draft, find the most recent submitted
            // rateRevision to attach to this contract on submit.
            const currentRev = await tx.rateRevisionTable.findFirst({
                where: {
                    rateID: rateID,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                include: {
                    contractRevisions: {
                        where: {
                            validUntil: null,
                        },
                        include: {
                            contractRevision: true,
                        },
                    },
                },
            })
            if (!currentRev) {
                console.error(
                    'Programming Error: cannot find the current revision to submit'
                )
                return new Error(
                    'Programming Error: cannot find the current revision to submit'
                )
            }

            if (!currentRev.submitInfoID) {
                console.error(
                    'Programming Error: cannot unlock a already unlocked rate'
                )
                return new Error(
                    'Programming Error: cannot unlock a already unlocked rate'
                )
            }

            const previouslySubmittedContractIDs =
                currentRev.contractRevisions.map(
                    (c) => c.contractRevision.contractID
                )

            await tx.rateRevisionTable.create({
                data: {
                    rate: {
                        connect: {
                            id: rateID,
                        },
                    },
                    rateCertificationName: currentRev.rateCertificationName,
                    unlockInfo: {
                        create: {
                            updatedAt: groupTime,
                            updatedByID: unlockedByUserID,
                            updatedReason: unlockReason,
                        },
                    },
                    draftContracts: {
                        connect: previouslySubmittedContractIDs.map((cID) => ({
                            id: cID,
                        })),
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

            return findRateWithHistory(tx, rateID)
        })
    } catch (err) {
        console.error('SUBMIT PRISMA CONTRACT ERR', err)
        return err
    }
}

export { unlockRate }
