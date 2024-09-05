import FETCH_CONTRACT from '../../../app-graphql/src/queries/fetchContract.graphql'
import SUBMIT_CONTRACT from '../../../app-graphql/src/mutations/submitContract.graphql'
import UNLOCK_CONTRACT from '../../../app-graphql/src/mutations/unlockContract.graphql'
import UPDATE_DRAFT_CONTRACT_RATES from '../../../app-graphql/src/mutations/updateDraftContractRates.graphql'
import WITHDRAW_REPLACE_RATE from '../../../app-graphql/src/mutations/withdrawAndReplaceRedundantRate.graphql'

import { findStatePrograms } from '../postgres'

import { must } from './assertionHelpers'
import {
    createTestHealthPlanPackage,
    defaultFloridaProgram,
    updateTestHealthPlanFormData,
} from './gqlHelpers'

import { type ContractType } from '../domain-models'
import type { ApolloServer } from 'apollo-server-lambda'
import type {
    Contract,
    ContractDraftRevisionFormDataInput,
    RateFormData,
    UnlockedContract,
} from '../gen/gqlServer'
import { latestFormData } from './healthPlanPackageHelpers'
import type { HealthPlanFormDataType, StateCodeType } from '@mc-review/hpp'
import { addNewRateToTestContract } from './gqlRateHelpers'
import UPDATE_CONTRACT_DRAFT_REVISION from 'app-graphql/src/mutations/updateContractDraftRevision.graphql'
import type { ContractFormDataType } from '../domain-models'
import type { CreateHealthPlanPackageInput } from '../gen/gqlServer'
import CREATE_CONTRACT from 'app-graphql/src/mutations/createContract.graphql'
import { mockGqlContractDraftRevisionFormDataInput } from './gqlContractInputMocks'

const createAndSubmitTestContract = async (
    server: ApolloServer,
    stateCode?: StateCodeType,
    formData?: Partial<ContractFormDataType>
): Promise<Contract> => {
    const contract = await createAndUpdateTestContractWithoutRates(
        server,
        stateCode,
        formData
    )
    return await must(
        submitTestContract(server, contract.id, 'Time to submit!')
    )
}

async function submitTestContract(
    server: ApolloServer,
    contractID: string,
    submittedReason?: string
): Promise<Contract> {
    const result = await server.executeOperation({
        query: SUBMIT_CONTRACT,
        variables: {
            input: {
                contractID: contractID,
                submittedReason: submittedReason,
            },
        },
    })

    if (result.errors) {
        throw new Error(
            `submitTestContract query failed with errors ${result.errors}`
        )
    }

    if (!result.data) {
        throw new Error('submitTestContract returned nothing')
    }

    return result.data.submitContract.contract
}

async function unlockTestContract(
    server: ApolloServer,
    contractID: string,
    unlockedReason?: string
): Promise<UnlockedContract> {
    const result = await server.executeOperation({
        query: UNLOCK_CONTRACT,
        variables: {
            input: {
                contractID: contractID,
                unlockedReason: unlockedReason,
            },
        },
    })

    if (result.errors) {
        throw new Error(
            `unlockTestContract query failed with errors ${result.errors}`
        )
    }

    if (!result.data) {
        throw new Error('unlockTestContract returned nothing')
    }

    return result.data.unlockContract.contract
}

async function createSubmitAndUnlockTestContract(
    stateServer: ApolloServer,
    cmsServer: ApolloServer
): Promise<UnlockedContract> {
    const contract = await createAndSubmitTestContractWithRate(stateServer)
    const contractID = contract.id

    const unlockedContract = await unlockTestContract(
        cmsServer,
        contractID,
        'test unlock'
    )

    return unlockedContract
}

async function createAndSubmitTestContractWithRate(
    server: ApolloServer,
    contractOverrides?: Partial<HealthPlanFormDataType>
): Promise<Contract> {
    const draft = await createAndUpdateTestContractWithRate(
        server,
        contractOverrides
    )
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
            `fetchTestContract query failed with errors ${result.errors}`
        )
    }

    if (!result.data) {
        throw new Error('fetchTestContract returned nothing')
    }

    return result.data.fetchContract.contract
}

async function updateTestContractToReplaceRate(
    server: ApolloServer,
    args: {
        contractID: string
        withdrawnRateID: string
        replacementRateID: string
        replaceReason: string
    }
): Promise<Contract> {
    const { contractID, withdrawnRateID, replacementRateID, replaceReason } =
        args
    const result = await server.executeOperation({
        query: WITHDRAW_REPLACE_RATE,
        variables: {
            input: {
                contractID,
                withdrawnRateID,
                replacementRateID,
                replaceReason,
            },
        },
    })

    if (result.errors) {
        throw new Error(
            `updateContractToReplaceRate mutation failed with errors ${result.errors}`
        )
    }

    if (!result.data) {
        throw new Error('updateContractToReplaceRate returned nothing')
    }

    return result.data.withdrawAndReplaceRedundantRate.contract
}
const createTestContract = async (
    server: ApolloServer,
    stateCode?: StateCodeType,
    formData?: Partial<ContractFormDataType>
): Promise<Contract> => {
    const programs = stateCode
        ? [must(findStatePrograms(stateCode))[0]]
        : [defaultFloridaProgram()]

    const programIDs = programs.map((program) => program.id)
    const input: CreateHealthPlanPackageInput = {
        programIDs: programIDs,
        populationCovered: 'MEDICAID',
        riskBasedContract: false,
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A created submission',
        contractType: 'BASE',
        ...formData,
    }
    const result = await server.executeOperation({
        query: CREATE_CONTRACT,
        variables: { input },
    })

    if (result.errors) {
        throw new Error(
            `createTestContract mutation failed with errors ${result.errors}`
        )
    }

    if (!result.data) {
        throw new Error('createTestContract returned nothing')
    }

    return result.data.createContract.contract
}

async function createAndUpdateTestContractWithRate(
    server: ApolloServer,
    contractOverrides?: Partial<HealthPlanFormDataType>
): Promise<Contract> {
    const draft = await createAndUpdateTestContractWithoutRates(
        server,
        (contractOverrides?.stateCode as StateCodeType) ?? 'FL',
        contractOverrides
    )

    return await addNewRateToTestContract(server, draft)
}

const createAndUpdateTestContractWithoutRates = async (
    server: ApolloServer,
    stateCode?: StateCodeType,
    contractFormDataOverrides?: Partial<HealthPlanFormDataType>
): Promise<Contract> => {
    const pkg = await createTestHealthPlanPackage(server, stateCode)
    const draft = latestFormData(pkg)

    draft.submissionType = 'CONTRACT_AND_RATES' as const
    draft.submissionDescription = 'An updated submission'
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
            s3URL: 's3://bucketname/key/test1',
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

    Object.assign(draft, contractFormDataOverrides)

    await updateTestHealthPlanFormData(server, draft)
    const updatedContract = await fetchTestContract(server, draft.id)
    return updatedContract
}

const linkRateToDraftContract = async (
    server: ApolloServer,
    contractID: string,
    linkedRateID: string
) => {
    const updatedContract = await server.executeOperation({
        query: UPDATE_DRAFT_CONTRACT_RATES,
        variables: {
            input: {
                contractID: contractID,
                updatedRates: [
                    {
                        type: 'LINK',
                        rateID: linkedRateID,
                    },
                ],
            },
        },
    })
    return updatedContract
}

const clearRatesOnDraftContract = async (
    server: ApolloServer,
    contractID: string
) => {
    const updatedContract = await server.executeOperation({
        query: UPDATE_DRAFT_CONTRACT_RATES,
        variables: {
            input: {
                contractID: contractID,
                updatedRates: [],
            },
        },
    })
    return updatedContract
}

const updateRateOnDraftContract = async (
    server: ApolloServer,
    contractID: string,
    rateID: string,
    rateData: Partial<RateFormData>
): Promise<ContractType> => {
    const updatedContract = await server.executeOperation({
        query: UPDATE_DRAFT_CONTRACT_RATES,
        variables: {
            input: {
                contractID: contractID,
                updatedRates: [
                    {
                        type: 'UPDATE',
                        formData: rateData,
                        rateID: rateID,
                    },
                ],
            },
        },
    })
    must(updatedContract)
    const contractData = updatedContract.data?.updateDraftContractRates.contract
    if (!contractData)
        throw Error(`malformatted response: ${updatedContract.data}`)
    return updatedContract.data?.contract
}

const updateTestContractDraftRevision = async (
    server: ApolloServer,
    contractID: string,
    lastSeenUpdatedAt?: Date,
    formData?: Partial<ContractDraftRevisionFormDataInput>
): Promise<Contract> => {
    const draftContract = await fetchTestContract(server, contractID)

    if (!draftContract.draftRevision) {
        throw new Error(
            'Unexpected error: Draft contract did not contain a draft revision'
        )
    }

    const updatedFormData =
        formData ||
        mockGqlContractDraftRevisionFormDataInput(
            draftContract.stateCode as StateCodeType
        )

    const updateResult = await server.executeOperation({
        query: UPDATE_CONTRACT_DRAFT_REVISION,
        variables: {
            input: {
                contractID: contractID,
                lastSeenUpdatedAt:
                    lastSeenUpdatedAt || draftContract.draftRevision.updatedAt,
                formData: updatedFormData,
            },
        },
    })

    if (updateResult.errors) {
        console.info('errors', JSON.stringify(updateResult.errors))
        throw new Error(
            `updateTestContractDraftRevision mutation failed with errors ${updateResult.errors}`
        )
    }

    if (!updateResult.data) {
        throw new Error('updateTestContractDraftRevision returned nothing')
    }

    return updateResult.data.updateContractDraftRevision.contract
}

export {
    submitTestContract,
    unlockTestContract,
    createAndSubmitTestContract,
    fetchTestContract,
    createAndUpdateTestContractWithoutRates,
    createAndUpdateTestContractWithRate,
    createAndSubmitTestContractWithRate,
    createSubmitAndUnlockTestContract,
    linkRateToDraftContract,
    updateRateOnDraftContract,
    clearRatesOnDraftContract,
    updateTestContractDraftRevision,
    createTestContract,
    updateTestContractToReplaceRate,
}
