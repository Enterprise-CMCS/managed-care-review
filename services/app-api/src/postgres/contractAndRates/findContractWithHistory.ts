import type { PrismaTransactionType } from '../prismaTypes'
import type { ContractType } from '../../domain-models/contractAndRates'
import { NotFoundError } from '../postgresErrors'
import { parseContractWithHistory } from './parseContractWithHistory'
import { includeFullContract } from './prismaSubmittedContractHelpers'

// findContractWithHistory returns a ContractType with a full set of
// ContractRevisions in reverse chronological order. Each revision is a change to this
// Contract with submit and unlock info. Changes to the data of this contract, or changes
// to the data or relations of associate revisions will all surface as new ContractRevisions
async function findContractWithHistory(
    client: PrismaTransactionType,
    contractID: string
): Promise<ContractType | NotFoundError | Error> {
    try {
        const contract = await client.contractTable.findUnique({
            where: {
                id: contractID,
            },
            include: includeFullContract,
        })

        if (!contract) {
            const err = `PRISMA ERROR: Cannot find contract with id: ${contractID}`
            return new NotFoundError(err)
        }

        return parseContractWithHistory(contract)
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findContractWithHistory }
