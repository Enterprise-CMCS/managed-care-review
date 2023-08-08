import { PrismaClient } from '@prisma/client'
import { ContractRevisionWithRatesType } from '../../domain-models/contractAndRates/contractAndRatesZodSchema'
import { parseDraftContractRevision } from '../../domain-models/contractAndRates/parseDomainData'
import { draftContractRevisionsWithDraftRates } from '../prismaHelpers'

// findDraftContract returns a draft (if any) for the given contract.
async function findDraftContract(
    client: PrismaClient,
    contractID: string
): Promise<ContractRevisionWithRatesType | undefined | Error> {
    try {
        const draftContractRevision =
            await client.contractRevisionTable.findFirst({
                where: {
                    contractID: contractID,
                    submitInfo: null,
                },
                include: draftContractRevisionsWithDraftRates,
            })

        if (!draftContractRevision) {
            return undefined
        }

        return parseDraftContractRevision(draftContractRevision)
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findDraftContract }
