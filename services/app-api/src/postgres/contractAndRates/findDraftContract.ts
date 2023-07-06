import { PrismaClient } from '@prisma/client'
import { ContractRevision } from './contractType'

// findDraftContract returns a draft (if any) for the given contract.
async function findDraftContract(
    client: PrismaClient,
    contractID: string
): Promise<ContractRevision | undefined | Error> {
    try {
        const draftContract = await client.contractRevisionTable.findFirst({
            where: {
                contractID: contractID,
                submitInfo: null,
            },
            include: {
                submitInfo: true,
                unlockInfo: true,
                draftRates: {
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

        if (!draftContract) {
            return undefined
        }

        const draft: ContractRevision = {
            id: draftContract.id,
            contractFormData: draftContract.submissionDescription ?? '',
            rateRevisions: draftContract.draftRates.map((dr) => ({
                id: dr.revisions[0].id,
                revisionFormData: dr.revisions[0].name,
            })),
        }

        return draft
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findDraftContract }
