import type { PrismaClient } from '@prisma/client'
import type { ContractType } from '../../domain-models/contractAndRates'
import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../storeError'

// Unlock the given contract
// * copy form data
// * set relationships based on last submission
async function unlockContract(
    client: PrismaClient,
    contractID: string,
    unlockedByUserID: string,
    unlockReason: string
): Promise<ContractType | NotFoundError | Error> {
    const groupTime = new Date()

    try {
        return await client.$transaction(async (tx) => {
            // Given all the Rates associated with this draft, find the most recent submitted
            // rateRevision to attach to this contract on submit.
            const currentRev = await tx.contractRevisionTable.findFirst({
                where: {
                    contractID: contractID,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                include: {
                    rateRevisions: {
                        where: {
                            validUntil: null,
                        },
                        include: {
                            rateRevision: true,
                        },
                    },
                },
            })
            if (!currentRev) {
                const err = `PRISMA ERROR: Cannot find the current revision to unlock with contract id: ${contractID}`
                console.error(err)
                return new NotFoundError(err)
            }

            if (!currentRev.submitInfoID) {
                console.error(
                    'Programming Error: cannot unlock a already unlocked contract'
                )
                return new Error(
                    'Programming Error: cannot unlock a already unlocked contract'
                )
            }

            const previouslySubmittedRateIDs = currentRev.rateRevisions.map(
                (c) => c.rateRevision.rateID
            )

            await tx.contractRevisionTable.create({
                data: {
                    contract: {
                        connect: {
                            id: contractID,
                        },
                    },
                    submissionType: currentRev.submissionType,
                    submissionDescription: currentRev.submissionDescription,
                    contractType: currentRev.contractType,
                    populationCovered: currentRev.populationCovered,
                    programIDs: currentRev.programIDs,
                    riskBasedContract: currentRev.riskBasedContract,
                    unlockInfo: {
                        create: {
                            updatedAt: groupTime,
                            updatedByID: unlockedByUserID,
                            updatedReason: unlockReason,
                        },
                    },
                    draftRates: {
                        connect: previouslySubmittedRateIDs.map((cID) => ({
                            id: cID,
                        })),
                    },
                },
                include: {
                    rateRevisions: {
                        include: {
                            rateRevision: true,
                        },
                    },
                },
            })

            return findContractWithHistory(tx, contractID)
        })
    } catch (err) {
        console.error('UNLOCK PRISMA CONTRACT ERR', err)
        return err
    }
}

export { unlockContract }
