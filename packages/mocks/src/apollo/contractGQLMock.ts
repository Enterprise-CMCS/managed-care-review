import {
    FetchContractQuery,
    Contract,
    UnlockedContract,
    FetchContractDocument,
    FetchContractWithQuestionsDocument,
    FetchContractWithQuestionsQuery,
    UpdateDraftContractRatesDocument,
    UpdateContractDraftRevisionMutation,
    UpdateContractDraftRevisionDocument,
    UpdateDraftContractRatesMutation,
    SubmitContractMutation,
    SubmitContractDocument,
    CreateContractMutation,
    CreateContractDocument,
    IndexContractsForDashboardDocument,
    IndexContractsForDashboardQuery,
} from '../gen/gqlClient'
import { MockedResponse } from '@apollo/client/testing'
import {
    mockContractPackageDraft,
    mockContractPackageSubmittedWithQuestions,
    mockContractPackageSubmittedWithRevisions,
    mockContractPackageUnlockedWithUnlockedType,
} from './contractPackageDataMock'
import {
    GRAPHQL_ERROR_CAUSE_MESSAGES,
    GraphQLErrorCauseTypes,
    GraphQLErrorCodeTypes,
} from './apolloErrorCodeMocks'
import { GraphQLError } from 'graphql'

const fetchContractMockSuccess = ({
    contract,
}: {
    contract?: Contract | UnlockedContract
}): MockedResponse<FetchContractQuery> => {
    let newContract: Contract | undefined
    // contract can be an unlockedContract type
    // however this API returns a contract type
    // check which type contract is and if it's UnlockedContract type
    // to pass the correct mocked type from the API
    if (contract && contract.__typename === 'UnlockedContract') {
        newContract = {
            ...contract,
            __typename: 'Contract',
        }
    } else if (contract && contract.__typename === 'Contract') {
        newContract = contract
    } else {
        newContract = undefined
    }

    const contractData = newContract ? newContract : mockContractPackageDraft()

    return {
        request: {
            query: FetchContractDocument,
            variables: { input: { contractID: contractData.id } },
        },
        result: {
            data: {
                fetchContract: {
                    contract: {
                        ...contractData,
                    },
                },
            },
        },
    }
}

const fetchContractMockFail = ({
    id,
    error,
}: {
    id: string
    error?: {
        code: GraphQLErrorCodeTypes
        cause: GraphQLErrorCauseTypes
    }
}): MockedResponse<FetchContractQuery | GraphQLError> => {
    const graphQLError = new GraphQLError(
        error
            ? GRAPHQL_ERROR_CAUSE_MESSAGES[error.cause]
            : 'Error attempting to submit.',
        {
            extensions: {
                code: error?.code,
                cause: error?.cause,
            },
        }
    )

    return {
        request: {
            query: FetchContractDocument,
            variables: { input: { contractID: id } },
        },
        error: graphQLError,
        result: {
            data: null,
            errors: [graphQLError],
        },
    }
}

const fetchContractWithQuestionsMockSuccess = ({
    contract,
}: {
    contract?: Contract | UnlockedContract
}): MockedResponse<FetchContractWithQuestionsQuery> => {
    let newContract: Contract | undefined
    // contract can be an unlockedContract type
    // however this API returns a contract type
    // check which type contract is and if it's UnlockedContract type
    // to pass the correct mocked type from the API
    if (contract && contract.__typename === 'UnlockedContract') {
        newContract = {
            ...contract,
            __typename: 'Contract',
        }
    } else if (contract && contract.__typename === 'Contract') {
        newContract = contract
    } else {
        newContract = undefined
    }

    const contractData = newContract
        ? newContract
        : mockContractPackageSubmittedWithQuestions()
    return {
        request: {
            query: FetchContractWithQuestionsDocument,
            variables: { input: { contractID: contractData.id } },
        },
        result: {
            data: {
                fetchContract: {
                    contract: {
                        ...contractData,
                    },
                },
            },
        },
    }
}

const createContractMockFail = ({
    error,
}: {
    error?: {
        code: GraphQLErrorCodeTypes
        cause: GraphQLErrorCauseTypes
    }
}): MockedResponse<CreateContractMutation | GraphQLError> => {
    const graphQLError = new GraphQLError(
        error
            ? GRAPHQL_ERROR_CAUSE_MESSAGES[error.cause]
            : 'Error attempting to submit.',
        {
            extensions: {
                code: error?.code,
                cause: error?.cause,
            },
        }
    )

    return {
        request: {
            query: CreateContractDocument,
            variables: { 
                input: { 
                    populationCovered: 'MEDICAID',
                    programIDs: ['d95394e5-44d1-45df-8151-1cc1ee66f100'],
                    riskBasedContract: false,
                    submissionType: 'CONTRACT_ONLY',
                    submissionDescription: 'A submitted submission',
                    contractType: 'BASE'
                } 
            },
        },
        error: graphQLError,
        result: {
            data: null,
            errors: [graphQLError],
        },
    }
}

const fetchContractWithQuestionsMockFail = ({
    id,
    error,
}: {
    id: string
    error?: {
        code: GraphQLErrorCodeTypes
        cause: GraphQLErrorCauseTypes
    }
}): MockedResponse<FetchContractWithQuestionsQuery | GraphQLError> => {
    const graphQLError = new GraphQLError(
        error
            ? GRAPHQL_ERROR_CAUSE_MESSAGES[error.cause]
            : 'Error attempting to submit.',
        {
            extensions: {
                code: error?.code,
                cause: error?.cause,
            },
        }
    )

    return {
        request: {
            query: FetchContractWithQuestionsDocument,
            variables: { input: { contractID: id } },
        },
        error: graphQLError,
        result: {
            data: null,
            errors: [graphQLError],
        },
    }
}

const createContractMockSuccess = ({
    contract,
}: {
    contract?: Partial<Contract>
}): MockedResponse<CreateContractMutation> => {
    const contractData = mockContractPackageDraft(contract)

    return {
        request: {
            query: FetchContractDocument,
            variables: { input: { contractID: contractData.id } },
        },
        result: {
            data: {
                createContract: {
                    contract: {
                        ...contractData,
                    },
                },
            },
        },
    }
}

const updateDraftContractRatesMockSuccess = ({
    contract,
}: {
    contract?: Partial<Contract>
}): MockedResponse<UpdateDraftContractRatesMutation> => {
    const contractData = mockContractPackageDraft(contract)
    const contractInput = {
        contractID: contractData.id,
        lastSeenUpdatedAt: contractData.draftRevision?.updatedAt,
        updatedRates: [
            {
                formData: {
                    rateType: undefined,
                    rateCapitationType: undefined,
                    rateDocuments: [],
                    supportingDocuments: [],
                    rateDateStart: undefined,
                    rateDateEnd: undefined,
                    rateDateCertified: undefined,
                    amendmentEffectiveDateStart: undefined,
                    amendmentEffectiveDateEnd: undefined,
                    rateProgramIDs: [],
                    deprecatedRateProgramIDs: [],
                    certifyingActuaryContacts: [
                        {
                            name: '',
                            titleRole: '',
                            email: '',
                            actuarialFirm: undefined,
                            actuarialFirmOther: '',
                        },
                    ],
                    addtlActuaryContacts: [],
                    actuaryCommunicationPreference: undefined,
                },
                rateID: undefined,
                type: 'CREATE',
            },
        ],
    }
    return {
        request: {
            query: UpdateDraftContractRatesDocument,
            variables: { input: contractInput },
        },
        result: {
            data: {
                updateDraftContractRates: {
                    contract: {
                        ...contractData,
                    },
                },
            },
        },
    }
}

const updateContractDraftRevisionMockSuccess = ({
    contract,
}: {
    contract?: Partial<Contract>
}): MockedResponse<UpdateContractDraftRevisionMutation> => {
    const contractData = mockContractPackageDraft(contract)
    const contractInput = {
        contractID: contractData.id,
        lastSeenUpdatedAt: contractData.draftRevision?.updatedAt,
        formData: contractData.draftRevision?.formData,
    }
    return {
        request: {
            query: UpdateDraftContractRatesDocument,
            variables: { input: contractInput },
        },
        result: {
            data: {
                updateContractDraftRevision: {
                    contract: {
                        ...contractData,
                    },
                },
            },
        },
    }
}
const updateContractDraftRevisionMockFail = ({
    contract,
    error,
}: {
    contract?: Partial<Contract>
    error?: {
        code: GraphQLErrorCodeTypes
        cause: GraphQLErrorCauseTypes
    }
}): MockedResponse<UpdateContractDraftRevisionMutation | GraphQLError> => {
    const contractData = mockContractPackageDraft(contract)
    const contractInput = {
        contractID: contractData.id,
        lastSeenUpdatedAt: contractData.draftRevision?.updatedAt,
        formData: contractData.draftRevision?.formData,
    }

    const graphQLError = new GraphQLError(
        error
            ? GRAPHQL_ERROR_CAUSE_MESSAGES[error.cause]
            : 'Error attempting to update',
        {
            extensions: {
                code: error?.code,
                cause: error?.cause,
            },
        }
    )

    return {
        request: {
            query: UpdateContractDraftRevisionDocument,
            variables: { input: contractInput },
        },
        error: graphQLError,
        result: {
            data: null,
            errors: [graphQLError],
        },
    }
}

const submitContractMockSuccess = ({
    id,
    submittedReason,
}: {
    submittedReason?: string
    id: string
}): MockedResponse<SubmitContractMutation> => {
    const contractData = mockContractPackageSubmittedWithRevisions({ id })
    return {
        request: {
            query: SubmitContractDocument,
            variables: { input: { contractID: id, submittedReason } },
        },
        result: { data: { submitContract: { contract: { ...contractData } } } },
    }
}

const submitContractMockError = ({
    id,
    error,
}: {
    id: string
    error?: {
        code: GraphQLErrorCodeTypes
        cause: GraphQLErrorCauseTypes
    }
}): MockedResponse<SubmitContractMutation | GraphQLError> => {
    const graphQLError = new GraphQLError(
        error
            ? GRAPHQL_ERROR_CAUSE_MESSAGES[error.cause]
            : 'Error attempting to submit.',
        {
            extensions: {
                code: error?.code,
                cause: error?.cause,
            },
        }
    )

    return {
        request: {
            query: SubmitContractDocument,
            variables: { input: { contractID: id } },
        },
        error: graphQLError,
        result: {
            data: null,
            errors: [graphQLError],
        },
    }
}

const indexContractsMockSuccess = (
    submissions: Contract[] = [
        {
            ...mockContractPackageUnlockedWithUnlockedType(),
            id: 'test-id-123',
            __typename: 'Contract',
        },
        { ...mockContractPackageSubmittedWithRevisions(), id: 'test-id-124' },
    ]
): MockedResponse<IndexContractsForDashboardQuery> => {
    const submissionEdges = submissions.map((sub) => {
        return {
            node: sub,
        }
    })
    return {
        request: {
            query: IndexContractsForDashboardDocument,
        },
        result: {
            data: {
                indexContracts: {
                    totalCount: submissionEdges.length,
                    edges: submissionEdges,
                },
            },
        },
    }
}

export {
    fetchContractMockSuccess,
    fetchContractMockFail,
    fetchContractWithQuestionsMockSuccess,
    fetchContractWithQuestionsMockFail,
    updateDraftContractRatesMockSuccess,
    updateContractDraftRevisionMockFail,
    updateContractDraftRevisionMockSuccess,
    submitContractMockSuccess,
    submitContractMockError,
    createContractMockFail,
    createContractMockSuccess,
    indexContractsMockSuccess,
}
