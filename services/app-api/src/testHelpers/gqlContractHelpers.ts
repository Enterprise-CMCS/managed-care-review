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
import { defaultFloridaProgram, executeGraphQLOperation } from './gqlHelpers'
import { type ContractType } from '../domain-models'
import type { ApolloServer } from '@apollo/server'
import type {
    Contract,
    ContractDraftRevisionFormDataInput,
    RateFormData,
    UnlockedContract,
} from '../gen/gqlServer'
import type { StateCodeType } from '@mc-review/hpp'
import { addNewRateToTestContract } from './gqlRateHelpers'
import type { ContractFormDataType } from '../domain-models'
import type { CreateContractInput } from '../gen/gqlServer'
import { mockGqlContractDraftRevisionFormDataInput } from './gqlContractInputMocks'
import type { GraphQLFormattedError } from 'graphql/index'
import { extractGraphQLResponse } from './apolloV4ResponseHelper'

const createAndSubmitTestContract = async (
    server: ApolloServer,
    stateCode?: StateCodeType,
    formData?: Partial<ContractFormDataType>
): Promise<Contract> => {
    const contract = await createAndUpdateTestContractWithoutRates(
        server,
        stateCode,
        {
            ...formData,
            submissionType: 'CONTRACT_ONLY',
        }
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
    const response = await executeGraphQLOperation(server, {
        query: SubmitContractDocument,
        variables: {
            input: {
                contractID: contractID,
                submittedReason: submittedReason,
            },
        },
    })

    if (response.errors) {
        throw new Error(
            `submitTestContract query failed with errors ${JSON.stringify(response.errors)}`
        )
    }

    if (!response.data.submitContract.contract) {
        throw new Error('submitTestContract returned nothing')
    }

    return response.data.submitContract.contract
}

async function resubmitTestContract(
    server: ApolloServer,
    contractID: string,
    submittedReason?: string
): Promise<Contract> {
    const updateResult = await executeGraphQLOperation(server, {
        query: SubmitContractDocument,
        variables: {
            input: {
                contractID,
                submittedReason,
            },
        },
    })

    if (updateResult.errors) {
        throw new Error(
            `resubmitTestContract query failed with errors ${JSON.stringify(updateResult.errors)}`
        )
    }

    if (!updateResult.data.submitContract.contract) {
        throw new Error('resubmitTestContract returned nothing')
    }

    return updateResult.data.submitContract.contract
}

async function unlockTestContract(
    server: ApolloServer,
    contractID: string,
    unlockedReason?: string
): Promise<UnlockedContract> {
    const result = await executeGraphQLOperation(server, {
        query: UnlockContractDocument,
        variables: {
            input: {
                contractID: contractID,
                unlockedReason: unlockedReason,
            },
        },
    })

    if (result.errors) {
        throw new Error(
            `unlockTestContract query failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    if (!result.data.unlockContract.contract) {
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

    return await unlockTestContract(cmsServer, contractID, 'test unlock')
}

async function createAndSubmitTestContractWithRate(
    server: ApolloServer,
    stateCode?: StateCodeType,
    contractOverrides?: Partial<ContractDraftRevisionFormDataInput>
): Promise<Contract> {
    const draft = await createAndUpdateTestContractWithRate(
        server,
        stateCode,
        contractOverrides
    )
    return await submitTestContract(server, draft.id, undefined)
}

async function fetchTestContract(
    server: ApolloServer,
    contractID: string
): Promise<Contract> {
    const input = { contractID }
    const result = await executeGraphQLOperation(server, {
        query: FetchContractDocument,
        variables: { input },
    })

    if (result.errors) {
        throw new Error(
            `fetchTestContract query failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    if (!result.data.fetchContract.contract) {
        throw new Error('fetchTestContract returned nothing')
    }

    return result.data.fetchContract.contract
}

async function approveTestContract(
    server: ApolloServer,
    contractID: string,
    dateApprovalReleasedToState?: string
): Promise<Contract> {
    const input = {
        contractID,
        dateApprovalReleasedToState:
            dateApprovalReleasedToState || '2024-11-11',
    }
    const result = await executeGraphQLOperation(server, {
        query: ApproveContractDocument,
        variables: { input },
    })

    if (result.errors) {
        throw new Error(
            `approveTestContract mutation failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    if (!result.data.approveContract.contract) {
        throw new Error('approveTestContract returned nothing')
    }

    return result.data.approveContract.contract
}

const fetchTestContractWithQuestions = async (
    server: ApolloServer,
    contractID: string
): Promise<Contract> => {
    const result = await executeGraphQLOperation(server, {
        query: FetchContractWithQuestionsDocument,
        variables: {
            input: {
                contractID: contractID,
            },
        },
    })

    if (result.errors) {
        throw new Error(
            `fetchTestContractWithQuestions query failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    if (!result.data.fetchContract.contract) {
        throw new Error('fetchTestContractWithQuestions returned nothing')
    }

    return result.data.fetchContract.contract
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
    const input: CreateContractInput = {
        programIDs: programIDs,
        populationCovered: 'MEDICAID',
        riskBasedContract: false,
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A created submission',
        contractType: 'BASE',
        ...formData,
    }
    const result = await executeGraphQLOperation(server, {
        query: CreateContractDocument,
        variables: { input },
    })

    if (result.errors) {
        throw new Error(
            `createTestContract mutation failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    if (!result.data.createContract.contract) {
        throw new Error('createTestContract returned nothing')
    }

    return result.data.createContract.contract
}

async function createAndUpdateTestContractWithRate(
    server: ApolloServer,
    stateCode?: StateCodeType,
    contractOverrides?: Partial<ContractDraftRevisionFormDataInput>
): Promise<Contract> {
    const draft = await createAndUpdateTestContractWithoutRates(
        server,
        stateCode ?? 'FL',
        contractOverrides
    )

    return await addNewRateToTestContract(server, draft, undefined)
}

const createAndUpdateTestContractWithoutRates = async (
    server: ApolloServer,
    stateCode?: StateCodeType,
    contractFormDataOverrides?: Partial<ContractDraftRevisionFormDataInput>
): Promise<Contract> => {
    const draftContract = await createTestContract(server, stateCode)
    const draftRevision = draftContract.draftRevision
    const formData = draftRevision?.formData

    if (!formData) {
        throw new Error(
            'Unexpected error: draft contract does not contain a draft revision.'
        )
    }

    formData.submissionType = 'CONTRACT_AND_RATES' as const
    formData.submissionDescription = 'An updated submission'
    formData.stateContacts = [
        {
            name: 'test name',
            titleRole: 'test title',
            email: 'email@example.com',
        },
    ]
    formData.contractType = 'BASE' as const
    formData.contractExecutionStatus = 'EXECUTED' as const
    formData.contractDateStart = '2025-06-01'
    formData.contractDateEnd = '2026-05-30'
    formData.contractDocuments = [
        {
            name: 'contractDocument.pdf',
            s3URL: 's3://bucketname/key/test1',
            sha256: 'fakesha',
            dateAdded: new Date(),
        },
    ]
    formData.managedCareEntities = ['MCO']
    formData.federalAuthorities = ['STATE_PLAN' as const]
    formData.populationCovered = 'MEDICAID' as const
    formData.inLieuServicesAndSettings = true
    formData.modifiedRiskSharingStrategy = false
    formData.modifiedIncentiveArrangements = false
    formData.modifiedWitholdAgreements = false
    formData.modifiedStateDirectedPayments = true
    formData.modifiedPassThroughPayments = true
    formData.modifiedPaymentsForMentalDiseaseInstitutions = true
    formData.modifiedNonRiskPaymentArrangements = true
    formData.modifiedBenefitsProvided = false
    formData.modifiedGeoAreaServed = false
    formData.modifiedMedicaidBeneficiaries = false
    formData.modifiedMedicalLossRatioStandards = false
    formData.modifiedOtherFinancialPaymentIncentive = false
    formData.modifiedEnrollmentProcess = false
    formData.modifiedGrevienceAndAppeal = false
    formData.modifiedNetworkAdequacyStandards = false
    formData.modifiedLengthOfContract = false
    formData.statutoryRegulatoryAttestation = false
    formData.statutoryRegulatoryAttestationDescription = 'No compliance'

    Object.assign(formData, contractFormDataOverrides)

    await updateTestContractDraftRevision(
        server,
        draftContract.id,
        draftRevision?.updatedAt,
        formData
    )
    return await fetchTestContract(server, draftContract.id)
}

const linkRateToDraftContract = async (
    server: ApolloServer,
    contractID: string,
    linkedRateID: string
) => {
    return await executeGraphQLOperation(server, {
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
    })
}

const clearRatesOnDraftContract = async (
    server: ApolloServer,
    contractID: string
): Promise<ContractType> => {
    const response = await executeGraphQLOperation(server, {
        query: UpdateDraftContractRatesDocument,
        variables: {
            input: {
                contractID: contractID,
                updatedRates: [],
            },
        },
    })

    if (response.errors) {
        throw new Error(
            `clearRatesOnDraftContract mutation failed with errors ${JSON.stringify(response.errors)}`
        )
    }

    if (!response.data?.updateDraftContractRates.contract) {
        throw new Error('clearRatesOnDraftContract returned nothing')
    }

    return response.data.updateDraftContractRates.contract
}

const updateRateOnDraftContract = async (
    server: ApolloServer,
    contractID: string,
    rateID: string,
    rateData: Partial<RateFormData>
): Promise<ContractType> => {
    const response = await executeGraphQLOperation(server, {
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
    })

    if (response.errors) {
        throw new Error(
            `updateRateOnDraftContract mutation failed with errors ${JSON.stringify(response.errors)}`
        )
    }

    if (!response.data?.updateDraftContractRates.contract) {
        throw new Error('updateRateOnDraftContract returned nothing')
    }

    return response.data?.contract
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

    const updateResult = await executeGraphQLOperation(server, {
        query: UpdateContractDraftRevisionDocument,
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
            `updateTestContractDraftRevision mutation failed with errors ${JSON.stringify(updateResult.errors)}`
        )
    }

    if (!updateResult.data.updateContractDraftRevision.contract) {
        throw new Error('updateTestContractDraftRevision returned nothing')
    }

    return updateResult.data.updateContractDraftRevision.contract
}

const withdrawTestContract = async (
    server: ApolloServer,
    contractID: string,
    updatedReason: string
): Promise<Contract> => {
    const withdrawResult = await executeGraphQLOperation(server, {
        query: WithdrawContractDocument,
        variables: {
            input: {
                contractID,
                updatedReason,
            },
        },
    })

    if (withdrawResult.errors) {
        console.info('errors', withdrawResult.errors)
    }

    if (!withdrawResult.data.withdrawContract.contract) {
        throw new Error('withdraw contract returned nothing')
    }

    return withdrawResult.data.withdrawContract.contract
}

const undoWithdrawTestContract = async (
    server: ApolloServer,
    contractID: string,
    updatedReason: string
): Promise<Contract> => {
    const undoWithdrawResult = await executeGraphQLOperation(server, {
        query: UndoWithdrawContractDocument,
        variables: {
            input: {
                contractID,
                updatedReason,
            },
        },
    })

    if (undoWithdrawResult.errors) {
        console.info('errors', undoWithdrawResult.errors)
    }

    if (!undoWithdrawResult.data.undoWithdrawContract.contract) {
        throw new Error('undo withdraw contract returned nothing')
    }

    return undoWithdrawResult.data.undoWithdrawContract.contract
}

const errorUndoWithdrawTestContract = async (
    server: ApolloServer,
    contractID: string,
    updatedReason: string
): Promise<ReadonlyArray<GraphQLFormattedError>> => {
    const response = await executeGraphQLOperation(server, {
        query: UndoWithdrawContractDocument,
        variables: {
            input: {
                contractID,
                updatedReason,
            },
        },
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
