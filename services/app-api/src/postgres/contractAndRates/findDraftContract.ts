import { PrismaClient } from '@prisma/client'
import { ContractRevision } from '../../domain-models/contractAndRates/contractType'
import { contractFormDataToDomainModel } from './prismaToDomainModel'
import { draftContractRevisionsWithDraftRates } from '../prismaHelpers'

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
            include: draftContractRevisionsWithDraftRates,
        })

        if (!draftContract) {
            return undefined
        }

        const draft: ContractRevision = {
            id: draftContract.id,
            createdAt: draftContract.createdAt,
            updatedAt: draftContract.updatedAt,
            formData: contractFormDataToDomainModel(draftContract),
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
