import {
    FetchContractDocument,
    SubmitContractDocument,
    UnlockContractDocument,
    UpdateDraftContractRatesDocument,
    UpdateContractDraftRevisionDocument,
    CreateContractDocument,
    FetchContractWithQuestionsDocument,
    ApproveContractDocument,
    WithdrawContractDocument,
    UndoWithdrawContractDocument,
} from '../gen/gqlClient'

import { findStatePrograms } from '../postgres'

import { must } from './assertionHelpers'
import {
    createTestHealthPlanPackage,
    defaultFloridaProgram,
    updateTestHealthPlanFormData,
    defaultContext,
} from './gqlHelpers'

import { type ContractType, type UserType } from '../domain-models'
import type { ApolloServer } from '@apollo/server'
import type {
    Contract,
    ContractDraftRevisionFormDataInput,
    RateFormData,
    UnlockedContract,
} from '../gen/gqlServer'
import { latestFormData } from './healthPlanPackageHelpers'
import type { HealthPlanFormDataType, StateCodeType } from '@mc-review/hpp'
import { addNewRateToTestContract } from './gqlRateHelpers'
import type { ContractFormDataType } from '../domain-models'
import type { CreateHealthPlanPackageInput } from '../gen/gqlServer'
import { mockGqlContractDraftRevisionFormDataInput } from './gqlContractInputMocks'
import type { GraphQLFormattedError } from 'graphql/index'

import { extractGraphQLResponse } from './apolloV4ResponseHelper'
import type { Context } from '../handlers/apollo_gql'

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
    submittedReason?: string,
    context?: Context
): Promise<Contract> {
    const response = await server.executeOperation({
        query: SubmitContractDocument,
        variables: {
            input: {
                contractID: contractID,
                submittedReason: submittedReason,
            },
        },
    }, {
        contextValue: context || defaultContext(),
    })
    
    const result = extractGraphQLResponse(response)

    if (result.errors) {
        throw new Error(
            `submitTestContract query failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    if (!result.data) {
        throw new Error('submitTestContract returned nothing')
    }

    return result.data.submitContract.contract
}

async function resubmitTestContract(
    server: ApolloServer,
    contractID: string,
    submittedReason?: string,
    context?: Context
): Promise<Contract> {
    const response = await server.executeOperation({
        query: SubmitContractDocument,
        variables: {
            input: {
                contractID,
                submittedReason,
            },
        },
    }, {
        contextValue: context || defaultContext(),
    })
    
    const updateResult = extractGraphQLResponse(response)

    if (updateResult.errors) {
        throw new Error(
            `resubmitTestContract query failed with errors ${JSON.stringify(updateResult.errors)}`
        )
    }

    if (!updateResult.data) {
        throw new Error('resubmitTestContract returned nothing')
    }

    return updateResult.data.submitContract.contract
}

async function unlockTestContract(
    server: ApolloServer,
    contractID: string,
    unlockedReason?: string,
    context?: Context
): Promise<UnlockedContract> {
    const response = await server.executeOperation({
        query: UnlockContractDocument,
        variables: {
            input: {
                contractID: contractID,
                unlockedReason: unlockedReason,
            },
        },
    }, {
        contextValue: context || defaultContext(),
    })
    
    const result = extractGraphQLResponse(response)

    if (result.errors) {
        throw new Error(
            `unlockTestContract query failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    if (!result.data) {
        throw new Error('unlockTestContract returned nothing')
    }

    return result.data.unlockContract.contract
}

async function unlockTestContractAsUser(
    server: ApolloServer,
    contractID: string,
    unlockedReason: string | undefined,
    user: UserType
): Promise<UnlockedContract> {
    const response = await server.executeOperation({
        query: UnlockContractDocument,
        variables: {
            input: {
                contractID: contractID,
                unlockedReason: unlockedReason,
            },
        },
    }, {
        contextValue: { user },
    })
    
    const result = extractGraphQLResponse(response)

    if (result.errors) {
        throw new Error(
            `unlockTestContract query failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    if (!result.data) {
        throw new Error('unlockTestContract returned nothing')
    }

    return result.data.unlockContract.contract
}

async function createSubmitAndUnlockTestContract(
    stateServer: ApolloServer,
    cmsServer: ApolloServer,
    cmsUser?: UserType
): Promise<UnlockedContract> {
    const contract = await createAndSubmitTestContractWithRate(stateServer)
    const contractID = contract.id

    const unlockedContract = cmsUser
        ? await unlockTestContractAsUser(cmsServer, contractID, 'test unlock', cmsUser)
        : await unlockTestContract(cmsServer, contractID, 'test unlock')

    return unlockedContract
}

async function createAndSubmitTestContractWithRate(
    server: ApolloServer,
    contractOverrides?: Partial<HealthPlanFormDataType>,
    context?: Context
): Promise<Contract> {
    const draft = await createAndUpdateTestContractWithRate(
        server,
        contractOverrides,
        context
    )
    return await submitTestContract(server, draft.id, undefined, context)
}

async function fetchTestContract(
    server: ApolloServer,
    contractID: string
): Promise<Contract> {
    const input = { contractID }
    const response = await server.executeOperation({
        query: FetchContractDocument,
        variables: { input },
    }, {
        contextValue: defaultContext(),
    })
    
    const result = extractGraphQLResponse(response)

    if (result.errors) {
        throw new Error(
            `fetchTestContract query failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    if (!result.data) {
        throw new Error('fetchTestContract returned nothing')
    }

    return result.data.fetchContract.contract
}

async function approveTestContract(
    server: ApolloServer,
    contractID: string,
    dateApprovalReleasedToState?: string,
    context?: Context
): Promise<Contract> {
    const input = {
        contractID,
        dateApprovalReleasedToState:
            dateApprovalReleasedToState || '2024-11-11',
    }
    const response = await server.executeOperation({
        query: ApproveContractDocument,
        variables: { input },
    }, {
        contextValue: context || defaultContext(),
    })
    
    const result = extractGraphQLResponse(response)

    if (result.errors) {
        throw new Error(
            `approveTestContract mutation failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    if (!result.data) {
        throw new Error('approveTestContract returned nothing')
    }

    return result.data.approveContract.contract
}

const fetchTestContractWithQuestions = async (
    server: ApolloServer,
    contractID: string,
    context?: Context
): Promise<Contract> => {
    const response = await server.executeOperation({
        query: FetchContractWithQuestionsDocument,
        variables: {
            input: {
                contractID: contractID,
            },
        },
    }, {
        contextValue: context || defaultContext(),
    })
    
    const result = extractGraphQLResponse(response)

    if (result.errors) {
        throw new Error(
            `fetchTestContractWithQuestions query failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    if (!result.data) {
        throw new Error('fetchTestContractWithQuestions returned nothing')
    }

    return result.data.fetchContract.contract
}

const createTestContract = async (
    server: ApolloServer,
    stateCode?: StateCodeType,
    formData?: Partial<ContractFormDataType>,
    context?: Context
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
    const response = await server.executeOperation({
        query: CreateContractDocument,
        variables: { input },
    }, {
        contextValue: context || defaultContext(),
    })
    
    const result = extractGraphQLResponse(response)

    if (result.errors) {
        throw new Error(
            `createTestContract mutation failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    if (!result.data) {
        throw new Error('createTestContract returned nothing')
    }

    return result.data.createContract.contract
}

async function createAndUpdateTestContractWithRate(
    server: ApolloServer,
    contractOverrides?: Partial<HealthPlanFormDataType>,
    context?: Context
): Promise<Contract> {
    const draft = await createAndUpdateTestContractWithoutRates(
        server,
        (contractOverrides?.stateCode as StateCodeType) ?? 'FL',
        contractOverrides,
        context
    )

    return await addNewRateToTestContract(server, draft, undefined, context)
}

const createAndUpdateTestContractWithoutRates = async (
    server: ApolloServer,
    stateCode?: StateCodeType,
    contractFormDataOverrides?: Partial<HealthPlanFormDataType>,
    context?: Context
): Promise<Contract> => {
    const pkg = await createTestHealthPlanPackage(server, stateCode, context)
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
            modifiedBenefitsProvided: false,
            modifiedGeoAreaServed: false,
            modifiedMedicaidBeneficiaries: false,
            modifiedMedicalLossRatioStandards: false,
            modifiedOtherFinancialPaymentIncentive: false,
            modifiedEnrollmentProcess: false,
            modifiedGrevienceAndAppeal: false,
            modifiedNetworkAdequacyStandards: false,
            modifiedLengthOfContract: false,
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
    const response = await server.executeOperation({
        query: UpdateDraftContractRatesDocument,
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
    }, {
        contextValue: defaultContext(),
    })
    
    const updatedContract = extractGraphQLResponse(response)
    return updatedContract
}

const clearRatesOnDraftContract = async (
    server: ApolloServer,
    contractID: string
) => {
    const response = await server.executeOperation({
        query: UpdateDraftContractRatesDocument,
        variables: {
            input: {
                contractID: contractID,
                updatedRates: [],
            },
        },
    }, {
        contextValue: defaultContext(),
    })
    
    const updatedContract = extractGraphQLResponse(response)
    return updatedContract
}

const updateRateOnDraftContract = async (
    server: ApolloServer,
    contractID: string,
    rateID: string,
    rateData: Partial<RateFormData>
): Promise<ContractType> => {
    const response = await server.executeOperation({
        query: UpdateDraftContractRatesDocument,
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
    }, {
        contextValue: defaultContext(),
    })
    
    const updatedContract = extractGraphQLResponse(response)
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

    const response = await server.executeOperation({
        query: UpdateContractDraftRevisionDocument,
        variables: {
            input: {
                contractID: contractID,
                lastSeenUpdatedAt:
                    lastSeenUpdatedAt || draftContract.draftRevision.updatedAt,
                formData: updatedFormData,
            },
        },
    }, {
        contextValue: defaultContext(),
    })
    
    const updateResult = extractGraphQLResponse(response)

    if (updateResult.errors) {
        console.info('errors', JSON.stringify(updateResult.errors))
        throw new Error(
            `updateTestContractDraftRevision mutation failed with errors ${JSON.stringify(updateResult.errors)}`
        )
    }

    if (!updateResult.data) {
        throw new Error('updateTestContractDraftRevision returned nothing')
    }

    return updateResult.data.updateContractDraftRevision.contract
}

const withdrawTestContract = async (
    server: ApolloServer,
    contractID: string,
    updatedReason: string,
    context?: Context
): Promise<Contract> => {
    const response = await server.executeOperation({
        query: WithdrawContractDocument,
        variables: {
            input: {
                contractID,
                updatedReason,
            },
        },
    }, {
        contextValue: context || defaultContext(),
    })
    
    const withdrawResult = extractGraphQLResponse(response)

    if (withdrawResult.errors) {
        console.info('errors', withdrawResult.errors)
    }

    if (
        withdrawResult.data === undefined ||
        withdrawResult.data === null
    ) {
        throw new Error('withdraw contract returned nothing')
    }

    return withdrawResult.data.withdrawContract.contract
}

const undoWithdrawTestContract = async (
    server: ApolloServer,
    contractID: string,
    updatedReason: string
): Promise<Contract> => {
    const response = await server.executeOperation({
        query: UndoWithdrawContractDocument,
        variables: {
            input: {
                contractID,
                updatedReason,
            },
        },
    }, {
        contextValue: defaultContext(),
    })
    
    const undoWithdrawResult = extractGraphQLResponse(response)

    if (undoWithdrawResult.errors) {
        console.info('errors', undoWithdrawResult.errors)
    }

    if (
        undoWithdrawResult.data === undefined ||
        undoWithdrawResult.data === null
    ) {
        throw new Error('undo withdraw contract returned nothing')
    }

    return undoWithdrawResult.data.undoWithdrawContract.contract
}

const errorUndoWithdrawTestContract = async (
    server: ApolloServer,
    contractID: string,
    updatedReason: string
): Promise<ReadonlyArray<GraphQLFormattedError>> => {
    const response = await server.executeOperation({
        query: UndoWithdrawContractDocument,
        variables: {
            input: {
                contractID,
                updatedReason,
            },
        },
    }, {
        contextValue: defaultContext(),
    })
    
    const undoWithdrawResult = extractGraphQLResponse(response)

    if (!undoWithdrawResult.errors) {
        throw new Error(
            'errorUndoWithdrawTestContract: expected errors to return'
        )
    }

    return undoWithdrawResult.errors
}

const contractHistoryToDescriptions = (contract: Contract): string[] => {
    return contract.packageSubmissions.reduce((history: string[], pkgSub) => {
        const updatedHistory = history

        if (pkgSub.cause !== 'CONTRACT_SUBMISSION') {
            return updatedHistory
        }

        if (pkgSub.submitInfo.updatedReason) {
            updatedHistory.unshift(pkgSub.submitInfo.updatedReason)
        }

        if (pkgSub.contractRevision.unlockInfo?.updatedReason) {
            updatedHistory.unshift(
                pkgSub.contractRevision.unlockInfo.updatedReason
            )
        }

        return updatedHistory
    }, [])
}

export {
    submitTestContract,
    unlockTestContract,
    unlockTestContractAsUser,
    createAndSubmitTestContract,
    approveTestContract,
    fetchTestContract,
    fetchTestContractWithQuestions,
    createAndUpdateTestContractWithoutRates,
    createAndUpdateTestContractWithRate,
    createAndSubmitTestContractWithRate,
    createSubmitAndUnlockTestContract,
    linkRateToDraftContract,
    updateRateOnDraftContract,
    clearRatesOnDraftContract,
    resubmitTestContract,
    updateTestContractDraftRevision,
    createTestContract,
    withdrawTestContract,
    undoWithdrawTestContract,
    contractHistoryToDescriptions,
    errorUndoWithdrawTestContract,
}
