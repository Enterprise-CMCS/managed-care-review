import { findStatePrograms } from '../postgres'
import type { InsertContractArgsType } from '../postgres/contractAndRates/insertContract'

import { must } from './assertionHelpers'
import { defaultFloridaProgram } from './gqlHelpers'
import { mockInsertContractArgs, mockContractData } from './contractDataMocks'
import { sharedTestPrismaClient } from './storeHelpers'
import { insertDraftContract } from '../postgres/contractAndRates/insertContract'

import type { ContractType } from '../domain-models'

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

// USING PRISMA DIRECTLY BELOW ---  we have no createContract resolver yet, but we have integration tests needing the workflows
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

export { createTestContract, createAndSubmitTestContract }
