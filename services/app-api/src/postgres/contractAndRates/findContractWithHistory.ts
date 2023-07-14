import { PrismaTransactionType } from '../prismaTypes'
import { ContractType } from '../../domain-models/contractAndRates/contractAndRatesZodSchema'
import { parseContractWithHistory } from '../../domain-models/contractAndRates/parseDomainData'
import { updateInfoIncludeUpdater } from '../prismaHelpers'

// findContractWithHistory returns a ContractType with a full set of
// ContractRevisions in reverse chronological order. Each revision is a change to this
// Contract with submit and unlock info. Changes to the data of this contract, or changes
// to the data or relations of associate revisions will all surface as new ContractRevisions
async function findContractWithHistory(
    client: PrismaTransactionType,
    contractID: string
): Promise<ContractType | Error> {
    try {
        const contract = await client.contractTable.findFirst({
            where: {
                id: contractID,
            },
            include: {
                revisions: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                    include: {
                        submitInfo: updateInfoIncludeUpdater,
                        unlockInfo: updateInfoIncludeUpdater,
                        rateRevisions: {
                            include: {
                                rateRevision: {
                                    include: {
                                        submitInfo: updateInfoIncludeUpdater,
                                        unlockInfo: updateInfoIncludeUpdater,
                                    },
                                },
                            },
                            orderBy: {
                                validAfter: 'asc',
                            },
                        },
                        stateContacts: true,
                        contractDocuments: true,
                        supportingDocuments: true,
                    },
                },
            },
        })

        if (!contract) {
            const err = `PRISMA ERROR: Cannot find contract with id: ${contractID}`
            console.error(err)
            return new Error(err)
        }

        return parseContractWithHistory(contract)
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findContractWithHistory }
