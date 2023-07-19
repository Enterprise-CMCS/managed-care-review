import { PrismaClient } from '@prisma/client'
import { RateRevision } from '../../domain-models/contractAndRates/rateType'
import { contractFormDataToDomainModel } from './prismaToDomainModel'
import { updateInfoIncludeUpdater } from '../prismaHelpers'

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
                submitInfo: updateInfoIncludeUpdater,
                unlockInfo: updateInfoIncludeUpdater,
                draftContracts: {
                    include: {
                        revisions: {
                            include: {
                                submitInfo: updateInfoIncludeUpdater,
                                unlockInfo: updateInfoIncludeUpdater,
                                stateContacts: true,
                                contractDocuments: true,
                                supportingDocuments: true,
                                rateRevisions: {
                                    include: {
                                        rateRevision: true,
                                    },
                                },
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
                createdAt: dc.revisions[0].createdAt,
                updatedAt: dc.revisions[0].updatedAt,
                formData: contractFormDataToDomainModel(dc.revisions[0]),
                rateRevisions: dc.revisions[0].rateRevisions.map((rr) => ({
                    id: rr.rateRevisionID,
                    revisionFormData: rr.rateRevision.name,
                })),
            })),
        }

        return draft
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findDraftRate }
