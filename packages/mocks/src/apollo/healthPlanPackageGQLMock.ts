import { MockedResponse } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'
import { unlockedWithALittleBitOfEverything } from '@mc-review/hpp'

import { UnlockedHealthPlanFormDataType } from '@mc-review/hpp'
import { domainToBase64 } from '@mc-review/hpp'
import {
    HealthPlanPackage,
    UnlockHealthPlanPackageDocument,
    UnlockHealthPlanPackageMutation,
    HealthPlanRevision,
    UnlockContractMutation,
    UnlockContractDocument,
    Contract,
    UnlockedContract,
} from '../gen/gqlClient'
import {
    mockContractAndRatesDraft,
    mockDraftHealthPlanPackage,
} from './healthPlanFormDataMock'
import {
    GRAPHQL_ERROR_CAUSE_MESSAGES,
    GraphQLErrorCauseTypes,
    GraphQLErrorCodeTypes,
} from './apolloErrorCodeMocks'
import { mockContractPackageUnlockedWithUnlockedType } from './contractPackageDataMock'

const mockSubmittedHealthPlanPackageWithRevision = ({
    currentSubmissionData,
    currentSubmitInfo,
    previousSubmissionData,
    previousSubmitInfo,
    initialSubmissionData,
    initialSubmitInfo,
}: {
    currentSubmissionData?: Partial<UnlockedHealthPlanFormDataType>
    currentSubmitInfo?: Partial<HealthPlanRevision['submitInfo']>
    previousSubmissionData?: Partial<UnlockedHealthPlanFormDataType>
    previousSubmitInfo?: Partial<HealthPlanRevision['submitInfo']>
    initialSubmissionData?: Partial<UnlockedHealthPlanFormDataType>
    initialSubmitInfo?: Partial<HealthPlanRevision['submitInfo']>
}): HealthPlanPackage => {
    const currentFiles: Partial<UnlockedHealthPlanFormDataType> = {
        contractDocuments: [
            {
                s3URL: 's3://bucketname/1648242632157-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf',
                sha256: 'fakesha',
                name: 'Amerigroup Texas, Inc.pdf',
            },
            {
                s3URL: 's3://bucketname/1648490162641-lifeofgalileo.pdf/lifeofgalileo.pdf',
                sha256: 'fakesha1',
                name: 'lifeofgalileo.pdf',
            },
        ],
        rateInfos: [
            {
                rateDocuments: [
                    {
                        s3URL: 's3://bucketname/1648242665634-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf',
                        sha256: 'fakesha2',
                        name: 'Amerigroup Texas, Inc.pdf',
                    },
                    {
                        s3URL: 's3://bucketname/1648242711421-Amerigroup Texas Inc copy.pdf/Amerigroup Texas Inc copy.pdf',
                        sha256: 'fakesha3',
                        name: 'Amerigroup Texas Inc copy.pdf',
                    },
                ],
                supportingDocuments: [
                    {
                        s3URL: 's3://bucketname/1648242873229-covid-ifc-2-flu-rsv-codes 5-5-2021.pdf/covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
                        sha256: 'fakesha5',
                        name: 'covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
                    },
                ],
                actuaryContacts: [],
                packagesWithSharedRateCerts: [],
            },
        ],
        documents: [
            {
                s3URL: 's3://bucketname/1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf/529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                sha256: 'fakesha3',
                name: '529-10-0020-00003_Superior_Health Plan, Inc.pdf',
            },
        ],
    }
    const previousFiles: Partial<UnlockedHealthPlanFormDataType> = {
        contractDocuments: [
            {
                s3URL: 's3://bucketname/1648242632157-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf',
                sha256: 'fakesha',
                name: 'Amerigroup Texas, Inc.pdf',
            },
            {
                s3URL: 's3://bucketname/1648242665634-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf',
                sha256: 'fakesha2',
                name: 'Amerigroup Texas, Inc.pdf',
            },
            {
                s3URL: 's3://bucketname/1648242711421-Amerigroup Texas Inc copy.pdf/Amerigroup Texas Inc copy.pdf',
                sha256: 'fakesha4',
                name: 'Amerigroup Texas Inc copy.pdf',
            },
        ],
        rateInfos: [
            {
                rateDocuments: [
                    {
                        s3URL: 's3://bucketname/1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf/529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                        sha256: 'fakesha3',
                        name: '529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                    },
                    {
                        s3URL: 's3://bucketname/1648242873229-covid-ifc-2-flu-rsv-codes 5-5-2021.pdf/covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
                        sha256: 'fakesha5',
                        name: 'covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
                    },
                    {
                        s3URL: 's3://bucketname/1648242632157-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf',
                        sha256: 'fakesha',
                        name: 'Amerigroup Texas, Inc.pdf',
                    },
                ],
                supportingDocuments: [
                    {
                        s3URL: 's3://bucketname/1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf/529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                        sha256: 'fakesha3',
                        name: '529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                    },
                ],
                actuaryContacts: [],
                packagesWithSharedRateCerts: [],
            },
        ],
        documents: [
            {
                s3URL: 's3://bucketname/1648242665634-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf',
                sha256: 'fakesha2',
                name: 'Amerigroup Texas, Inc.pdf',
            },
            {
                s3URL: 's3://bucketname/1648242711421-Amerigroup Texas Inc copy.pdf/Amerigroup Texas Inc copy.pdf',
                sha256: 'fakesha4',
                name: 'Amerigroup Texas Inc copy.pdf',
            },
        ],
    }

    const currentProto = domainToBase64({
        ...unlockedWithALittleBitOfEverything(),
        ...currentFiles,
        ...currentSubmissionData,
    })
    const currentSubmit = {
        updatedAt: '2022-03-28T17:56:32.952Z',
        updatedBy: {
            email: 'aang@example.com',
            role: 'STATE_USER',
            familyName: 'Airman',
            givenName: 'Aang',
        },
        updatedReason: 'Placeholder resubmission reason',
        ...currentSubmitInfo,
    }
    const previousProto = domainToBase64({
        ...unlockedWithALittleBitOfEverything(),
        ...previousFiles,
        ...previousSubmissionData,
    })

    const previousSubmit = {
        updatedAt: '2022-03-25T21:14:43.057Z',
        updatedBy: {
            email: 'aang@example.com',
            role: 'STATE_USER',
            familyName: 'Airman',
            givenName: 'Aang',
        },
        updatedReason: 'Placeholder resubmission reason',
        ...previousSubmitInfo,
    }
    const initialProto = domainToBase64({
        ...mockContractAndRatesDraft(),
        ...previousFiles,
        ...initialSubmissionData,
    })

    const initialSubmit = {
        updatedAt: '2022-03-25T21:13:20.419Z',
        updatedBy: {
            email: 'aang@example.com',
            role: 'STATE_USER',
            familyName: 'Airman',
            givenName: 'Aang',
        },
        updatedReason: 'Initial submission',
        ...initialSubmitInfo,
    }
    return {
        __typename: 'HealthPlanPackage',
        id: '07f9efbf-d4d1-44ae-8674-56d9d6b75ce6',
        stateCode: 'MN',
        state: {
            name: 'Minnesota',
            code: 'MN',
            programs: [],
        },
        status: 'RESUBMITTED',
        initiallySubmittedAt: '2022-03-25',
        revisions: [
            {
                __typename: 'HealthPlanRevisionEdge',
                node: {
                    __typename: 'HealthPlanRevision',
                    id: '135972bf-e056-40d3-859c-6a69d9c982ad',
                    unlockInfo: {
                        __typename: 'UpdateInformation',
                        updatedAt: '2022-03-28T17:54:39.173Z',
                        updatedBy: {
                            email: 'zuko@example.com',
                            role: 'CMS_USER',
                            familyName: 'Hotman',
                            givenName: 'Zuko',
                        },
                        updatedReason: 'prepare to add documents',
                    },
                    submitInfo: {
                        __typename: 'UpdateInformation',
                        ...currentSubmit,
                    },
                    createdAt: '2022-03-28T17:54:39.175Z',
                    formDataProto: currentProto,
                },
            },
            {
                __typename: 'HealthPlanRevisionEdge',
                node: {
                    __typename: 'HealthPlanRevision',
                    id: '9aa14122-2d37-462a-b788-e25c1c30e8dc',
                    unlockInfo: {
                        __typename: 'UpdateInformation',
                        updatedAt: '2022-03-25T21:13:56.174Z',
                        updatedBy: {
                            email: 'zuko@example.com',
                            role: 'CMS_USER',
                            familyName: 'Hotman',
                            givenName: 'Zuko',
                        },
                        updatedReason: 'test',
                    },
                    submitInfo: {
                        __typename: 'UpdateInformation',
                        ...previousSubmit,
                    },
                    createdAt: '2022-03-25T21:13:56.176Z',
                    formDataProto: previousProto,
                },
            },
            {
                __typename: 'HealthPlanRevisionEdge',
                node: {
                    __typename: 'HealthPlanRevision',
                    id: '95fa29ec-c8b1-4195-82c1-5615bcda7bac',
                    unlockInfo: null,
                    submitInfo: {
                        __typename: 'UpdateInformation',
                        ...initialSubmit,
                    },
                    createdAt: '2022-03-25T03:28:56.244Z',
                    formDataProto: initialProto,
                },
            },
        ],
    }
}

type unlockContractMockSuccessProps = {
    contract?: Contract
    id: string
    reason: string
}

const transformUnlockedContractToContract = (contract: UnlockedContract): Contract => {
    return {
        ...contract,
        __typename: 'Contract',
    }
}
const unlockContractMockSuccess = ({
    contract = transformUnlockedContractToContract(mockContractPackageUnlockedWithUnlockedType()),
    id,
    reason,
}: unlockContractMockSuccessProps): MockedResponse<UnlockContractMutation> => {
    // HACK, for some reason tests started failing with getting the types just right
    // As we get those types everywhere we can revisit this.
    const unlockedContract = contract as UnlockedContract

    return {
        request: {
            query: UnlockContractDocument,
            variables: { input: { contractID: id, unlockedReason: reason } },
        },
        result: { data: { unlockContract: { contract: unlockedContract } } },
    }
}

const unlockHealthPlanPackageMockError = ({
    id,
    reason,
    error,
}: {
    id: string
    reason: string
    error?: {
        code: GraphQLErrorCodeTypes
        cause: GraphQLErrorCauseTypes
    }
}): MockedResponse<UnlockHealthPlanPackageMutation> => {
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
            query: UnlockHealthPlanPackageDocument,
            variables: { input: { pkgID: id, unlockedReason: reason } },
        },
        result: {
            data: null,
            errors: [graphQLError],
        },
    }
}

const unlockContractMockError = ({
    id,
    reason,
    error,
}: {
    id: string
    reason: string
    error?: {
        code: GraphQLErrorCodeTypes
        cause: GraphQLErrorCauseTypes
    }
}): MockedResponse<UnlockContractMutation> => {
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
            query: UnlockContractDocument,
            variables: { input: { contractID: id, unlockedReason: reason } },
        },
        result: {
            data: null,
            errors: [graphQLError],
        },
    }
}

export {
    unlockHealthPlanPackageMockError,
    unlockContractMockSuccess,
    unlockContractMockError,
    mockSubmittedHealthPlanPackageWithRevision,
}
