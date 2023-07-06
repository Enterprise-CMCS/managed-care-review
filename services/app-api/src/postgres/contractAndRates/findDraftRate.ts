import { PrismaClient } from '@prisma/client'
import { RateRevision } from './rateType'

// findDraftRate returns a draft (if any) for the given contract.
async function findDraftRate(
    client: PrismaClient,
    rateID: string
): Promise<RateRevision | undefined | Error> {
    try {
        const draftRate = await client.rateRevisionTable.findFirst({
            where: {
                rateID: rateID,
                submitInfo: null,
            },
            include: {
                submitInfo: true,
                unlockInfo: true,
                draftContracts: {
                    include: {
                        revisions: {
                            include: {
                                submitInfo: true,
                                unlockInfo: true,
                            },
                            where: {
                                submitInfoID: { not: null },
                            },
                            take: 1,
                            orderBy: {
                                createdAt: 'desc',
                            },
                        },
                    },
                },
            },
        })

        if (!draftRate) {
            return undefined
        }

        const draft: RateRevision = {
            id: draftRate.id,
            revisionFormData: draftRate.name,

            contractRevisions: draftRate.draftContracts.map((dc) => ({
                id: dc.revisions[0].id,
                contractFormData: dc.revisions[0].submissionDescription ?? '',
                rateRevisions: [],
            })),
        }

        return draft
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findDraftRate }
