import { PrismaClient } from '@prisma/client'
import { RateRevisionWithContractsType } from '../../domain-models/contractAndRates/contractAndRatesZodSchema'
import {
    contractFormDataToDomainModel,
    includeUpdateInfo,
    rateFormDataToDomainModel,
} from './prismaSharedContractRateHelpers'

// findDraftRate returns a draft (if any) for the given contract.
async function findDraftRate(
    client: PrismaClient,
    rateID: string
): Promise<RateRevisionWithContractsType | undefined | Error> {
    try {
        const draftRate = await client.rateRevisionTable.findFirst({
            where: {
                rateID: rateID,
                submitInfo: null,
            },
            include: {
                submitInfo: includeUpdateInfo,
                unlockInfo: includeUpdateInfo,
                rateDocuments: true,
                supportingDocuments: true,
                certifyingActuaryContacts: true,
                addtlActuaryContacts: true,
                draftContracts: {
                    include: {
                        revisions: {
                            include: {
                                submitInfo: includeUpdateInfo,
                                unlockInfo: includeUpdateInfo,
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

        const draft: RateRevisionWithContractsType = {
            id: draftRate.id,
            createdAt: draftRate.createdAt,
            updatedAt: draftRate.updatedAt,

            revisionFormData: rateFormDataToDomainModel(draftRate),

            contractRevisions: draftRate.draftContracts.map((dc) => ({
                id: dc.revisions[0].id,
                createdAt: dc.revisions[0].createdAt,
                updatedAt: dc.revisions[0].updatedAt,
                formData: contractFormDataToDomainModel(dc.revisions[0]),
            })),
        }

        return draft
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findDraftRate }
