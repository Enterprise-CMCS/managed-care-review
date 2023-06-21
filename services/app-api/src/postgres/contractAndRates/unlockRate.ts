import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { findRate } from './findRate'
import { Rate } from './rateType'

// Unlock the given rate
// * copy form data
// * set relationships based on last submission
async function unlockRate(
    client: PrismaClient,
    rateID: string,
    unlockedByUserID: string,
    unlockReason: string
): Promise<Rate | Error> {
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
                console.error('No Rev! Contracts should always have revisions.')
                return new Error('cant find the current rev to submit')
            }

            if (!currentRev.submitInfoID) {
                console.error(
                    'this contract already has an unsubmitted revision'
                )
                return new Error('cant unlock an alreday unlocked submission')
            }

            const previouslySubmittedContractIDs =
                currentRev.contractRevisions.map(
                    (c) => c.contractRevision.contractID
                )

            await tx.rateRevisionTable.create({
                data: {
                    id: uuidv4(),
                    rate: {
                        connect: {
                            id: rateID,
                        },
                    },
                    name: currentRev.name,
                    unlockInfo: {
                        create: {
                            id: uuidv4(),
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

            return findRate(tx, rateID)
        })
    } catch (err) {
        console.error('SUBMIT PRISMA CONTRACT ERR', err)
        return err
    }
}

export { unlockRate }
