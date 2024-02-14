import SUBMIT_CONTRACT from 'app-graphql/src/queries/fetchContract.graphql'
import UPDATE_CONTRACT from 'app-graphql/src/mutations/updateContract.graphql'
import { findStatePrograms } from '../postgres'
import type { InsertContractArgsType } from '../postgres/contractAndRates/insertContract'

import { must } from './assertionHelpers'
import { defaultFloridaProgram } from './gqlHelpers'
import { mockInsertContractArgs, mockContractData } from './contractDataMocks'
import { sharedTestPrismaClient } from './storeHelpers'
import { insertDraftContract } from '../postgres/contractAndRates/insertContract'
import { submitContract } from '../postgres/contractAndRates/submitContract'
// import { updateDraftContract } from '../postgres/contractAndContracts/updateDraftContract'

import type { ContractType } from '../domain-models'
// import type { ContractFormEditable } from '../postgres/contractAndContracts/updateDraftContract'
import type { ApolloServer } from 'apollo-server-lambda'

// NOTES: there's no create contract, unlock contract, submit contract, fetch contract, index contracts
// there's no 
// const fetchTestContractById = async (
//     server: ApolloServer,
//     contractID: string
// ): Promise<ContractType> => {
//     const input = { contractID }
//     const result = await server.executeOperation({
//         query: FETCH_CONTRACT,
//         variables: { input },
//     })

//     if (result.errors)
//         throw new Error(
//             `fetchTestContractById query failed with errors ${result.errors}`
//         )

//     if (!result.data) {
//         throw new Error('fetchTestContractById returned nothing')
//     }

//     return result.data.fetchContract.contract
// }

const createAndSubmitTestContract = async (
    contractData?: InsertContractArgsType
): Promise<ContractType> => {
    const contract = await createTestContract(contractData)
    return await must(submitTestContract(contract))
}

const submitTestContract = async (
    contractData?: Partial<InsertContractArgsType>
): Promise<ContractType> => {
    const prismaClient = await sharedTestPrismaClient()
    const defaultContractData = { ...mockContractData() }
    const initialData = {
        ...defaultContractData,
        ...contractData, // override with any new fields passed in
    }
    const programs = initialData.stateCode
        ? [must(findStatePrograms(initialData.stateCode))[0]]
        : [defaultFloridaProgram()]

    const programIDs = programs.map((program) => program.id)

    const draftContractData = mockInsertContractArgs({
        ...initialData,
        programIDs: programIDs,
        stateCode: 'FL',
    })

    return must(await insertDraftContract(prismaClient, draftContractData))
}

// const unlockTestContract = async (
//     server: ApolloServer,
//     rateID: string,
//     unlockReason: string
// ) => {
//     const updateResult = await server.executeOperation({
//         query: UNLOCK_RATE,
//         variables: {
//             input: {
//                 rateID,
//                 unlockedReason: unlockReason,
//             },
//         },
//     })

//     if (updateResult.errors) {
//         console.info('errors', updateResult.errors)
//         throw new Error(
//             `unlockContract mutation failed with errors ${updateResult.errors}`
//         )
//     }

//     if (updateResult.data === undefined || updateResult.data === null) {
//         throw new Error('unlockTestContract returned nothing')
//     }

//     return updateResult.data.unlockContract.rate
// }

// USING PRISMA DIRECTLY BELOW ---  we have no createContract or updateContract resolvers yet, but we have integration tests needing the workflows
const createTestContract = async (
    contractData?: Partial<InsertContractArgsType>
): Promise<ContractType> => {
    const prismaClient = await sharedTestPrismaClient()
    const defaultContractData = { ...mockContractData() }
    const initialData = {
        ...defaultContractData,
        ...contractData, // override with any new fields passed in
    }
    const programs = initialData.stateCode
        ? [must(findStatePrograms(initialData.stateCode))[0]]
        : [defaultFloridaProgram()]

    const programIDs = programs.map((program) => program.id)

    const draftContractData = mockInsertContractArgs({
        ...initialData,
        programIDs: programIDs,
        stateCode: 'FL',
    })

    return must(await insertDraftContract(prismaClient, draftContractData))
}

// const updateTestContract = async (
//     rateID: string,
//     contractData: ContractFormEditable
// ): Promise<ContractType> => {
//     const prismaClient = await sharedTestPrismaClient()

//     return must(
//         await updateDraftContract(prismaClient, {
//             rateID: rateID,
//             formData: contractData,
//             contractIDs: [],
//         })
//     )
// }

export {
    createTestContract,
    createAndSubmitTestContract,
    // fetchTestContractById,
    // submitTestContract,
    // unlockTestContract,
    // updateTestContract,
}
