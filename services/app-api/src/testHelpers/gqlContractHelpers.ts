import FETCH_CONTRACT from '../../../app-graphql/src/queries/fetchContract.graphql'
import SUBMIT_CONTRACT from '../../../app-graphql/src/mutations/submitContract.graphql'
import { findStatePrograms } from '../postgres'
import type { InsertContractArgsType } from '../postgres/contractAndRates/insertContract'

import { must } from './assertionHelpers'
import {
    createTestHealthPlanPackage,
    defaultFloridaProgram,
    updateTestHealthPlanFormData,
} from './gqlHelpers'
import { mockInsertContractArgs, mockContractData } from './contractDataMocks'
import { sharedTestPrismaClient } from './storeHelpers'
import { insertDraftContract } from '../postgres/contractAndRates/insertContract'

import type { ContractType } from '../domain-models'
import type { ApolloServer } from 'apollo-server-lambda'
import type { Contract } from '../gen/gqlServer'
import { latestFormData } from './healthPlanPackageHelpers'
import type { StateCodeType } from 'app-web/src/common-code/healthPlanFormDataType'
import { addNewRateToTestContract } from './gqlRateHelpers'

const createAndSubmitTestContract = async (
    contractData?: InsertContractArgsType
): Promise<ContractType> => {
    const contract = await createTestContract(contractData)
    return await must(submitTestContractWithDB(contract))
}

const submitTestContractWithDB = async (
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

async function submitTestContract(
    server: ApolloServer,
    contractID: string
): Promise<Contract> {
    const result = await server.executeOperation({
        query: SUBMIT_CONTRACT,
        variables: {
            input: {
                contractID: contractID,
            },
        },
    })

    if (result.errors) {
        throw new Error(
            `fetchTestRateById query failed with errors ${result.errors}`
        )
    }

    if (!result.data) {
        throw new Error('fetchTestRateById returned nothing')
    }

    return result.data.submitContract.contract
}

async function createAndSubmitTestContractWithRate(
    server: ApolloServer
): Promise<Contract> {
    const draft = await createAndUpdateTestContractWithRate(server)

    return await submitTestContract(server, draft.id)
}

async function fetchTestContract(
    server: ApolloServer,
    contractID: string
): Promise<Contract> {
    const input = { contractID }
    const result = await server.executeOperation({
        query: FETCH_CONTRACT,
        variables: { input },
    })

    if (result.errors) {
        throw new Error(
            `fetchTestRateById query failed with errors ${result.errors}`
        )
    }

    if (!result.data) {
        throw new Error('fetchTestRateById returned nothing')
    }

    return result.data.fetchContract.contract
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

async function createAndUpdateTestContractWithRate(
    server: ApolloServer
): Promise<Contract> {
    const draft = await createAndUpdateTestContractWithoutRates(server)
    return await addNewRateToTestContract(server, draft)
}

const createAndUpdateTestContractWithoutRates = async (
    server: ApolloServer,
    stateCode?: StateCodeType
): Promise<Contract> => {
    const pkg = await createTestHealthPlanPackage(server, stateCode)
    const draft = latestFormData(pkg)

    ;(draft.submissionType = 'CONTRACT_AND_RATES' as const),
        (draft.submissionDescription = 'An updated submission')
    draft.stateContacts = [
        {
            name: 'test name',
            titleRole: 'test title',
            email: 'email@example.com',
        },
    ]
    draft.rateInfos = []
    draft.contractType = 'BASE' as const
    draft.contractExecutionStatus = 'EXECUTED' as const
    draft.contractDateStart = new Date(Date.UTC(2025, 5, 1))
    draft.contractDateEnd = new Date(Date.UTC(2026, 4, 30))
    draft.contractDocuments = [
        {
            name: 'contractDocument.pdf',
            s3URL: 'fakeS3URL',
            sha256: 'fakesha',
        },
    ]
    draft.managedCareEntities = ['MCO']
    draft.federalAuthorities = ['STATE_PLAN' as const]
    draft.populationCovered = 'MEDICAID' as const
    draft.contractAmendmentInfo = {
        modifiedProvisions: {
            inLieuServicesAndSettings: true,
            modifiedRiskSharingStrategy: false,
            modifiedIncentiveArrangements: false,
            modifiedWitholdAgreements: false,
            modifiedStateDirectedPayments: true,
            modifiedPassThroughPayments: true,
            modifiedPaymentsForMentalDiseaseInstitutions: true,
            modifiedNonRiskPaymentArrangements: true,
        },
    }
    draft.statutoryRegulatoryAttestation = false
    draft.statutoryRegulatoryAttestationDescription = 'No compliance'

    await updateTestHealthPlanFormData(server, draft)
    const updatedContract = await fetchTestContract(server, draft.id)
    return updatedContract
}

export {
    createTestContract,
    submitTestContract,
    createAndSubmitTestContract,
    fetchTestContract,
    createAndUpdateTestContractWithoutRates,
    createAndUpdateTestContractWithRate,
    createAndSubmitTestContractWithRate,
}
