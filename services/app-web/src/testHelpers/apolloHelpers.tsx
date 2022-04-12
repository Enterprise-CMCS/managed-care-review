import { MockedResponse } from '@apollo/client/testing'
import dayjs from 'dayjs'
import { GraphQLError } from 'graphql'
import {
    basicLockedHealthPlanFormData,
    basicHealthPlanFormData,
    unlockedWithALittleBitOfEverything,
} from '../common-code/domain-mocks'
import { UnlockedHealthPlanFormDataType } from '../common-code/domain-models'
import { domainToBase64 } from '../common-code/proto/stateSubmission'
import {
    CreateDraftSubmissionDocument,
    DraftSubmission,
    DraftSubmissionUpdates,
    FetchCurrentUserDocument,
    FetchStateSubmissionDocument,
    FetchHealthPlanPackageDocument,
    IndexHealthPlanPackagesDocument,
    IndexSubmissionsDocument,
    State,
    StateSubmission,
    Submission,
    HealthPlanPackage,
    SubmitHealthPlanPackageDocument,
    UnlockHealthPlanPackageDocument,
    UpdateDraftSubmissionDocument,
    User as UserType,
} from '../gen/gqlClient'

/* For use with Apollo MockedProvider in jest tests */
function mockValidUser(): UserType {
    return {
        __typename: 'StateUser' as const,
        state: mockMNState(),
        role: 'STATE_USER',
        name: 'Bob it user',
        email: 'bob@dmas.mn.gov',
    }
}

function mockValidCMSUser(): UserType {
    return {
        __typename: 'CMSUser' as const,
        role: 'CMS_USER',
        name: 'Bob it user',
        email: 'bob@dmas.mn.gov',
    }
}

export function mockDraft(): DraftSubmission {
    return {
        __typename: 'DraftSubmission',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        name: 'MN-MSHO-0001',
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: dayjs().add(2, 'days').toDate(),
        contractAmendmentInfo: null,
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: null,
        rateDocuments: [],
        rateDateStart: null,
        rateDateEnd: null,
        rateDateCertified: null,
        rateAmendmentInfo: null,
        stateContacts: [],
        actuaryContacts: [],
        actuaryCommunicationPreference: null,
    }
}

export function mockContactAndRatesDraft(): DraftSubmission {
    return {
        __typename: 'DraftSubmission',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        name: 'MN-MSHO-0001',
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: dayjs().add(2, 'days').toDate(),
        contractAmendmentInfo: null,
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: null,
        rateDocuments: [],
        rateDateStart: null,
        rateDateEnd: null,
        rateDateCertified: null,
        rateAmendmentInfo: null,
        stateContacts: [],
        actuaryContacts: [],
        actuaryCommunicationPreference: null,
    }
}

export function mockCompleteDraft(): DraftSubmission {
    return {
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        name: 'MN-MSHO-0001',
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
        contractAmendmentInfo: null,
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: 'NEW',
        rateDocuments: [],
        rateDateStart: new Date(),
        rateDateEnd: new Date(),
        rateDateCertified: new Date(),
        rateAmendmentInfo: null,
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test@test.com',
            },
        ],
        actuaryContacts: [],
        actuaryCommunicationPreference: null,
    }
}

export function mockContractAndRatesDraft(): DraftSubmission {
    return {
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['pmap'],
        name: 'MN-PMAP-0001',
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'AMENDMENT',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
        contractAmendmentInfo: {
            itemsBeingAmended: [
                'BENEFITS_PROVIDED',
                'LENGTH_OF_CONTRACT_PERIOD',
                'CAPITATION_RATES',
            ],
            otherItemBeingAmended: 'Test amendment',
            capitationRatesAmendedInfo: {
                reason: 'OTHER',
                otherReason: 'Test reason',
            },
            relatedToCovid19: true,
        },
        managedCareEntities: ['MCO'],
        federalAuthorities: ['STATE_PLAN'],
        rateType: 'AMENDMENT',
        rateDocuments: [],
        rateDateStart: new Date(),
        rateDateEnd: new Date(),
        rateDateCertified: new Date(),
        rateAmendmentInfo: {
            effectiveDateStart: new Date(),
            effectiveDateEnd: new Date(),
        },
        stateContacts: [
            {
                name: 'State Contact 1',
                titleRole: 'Test State Contact 1',
                email: 'statecontact1@test.com',
            },
            {
                name: 'State Contact 2',
                titleRole: 'Test State Contact 2',
                email: 'statecontact2@test.com',
            },
        ],
        actuaryContacts: [
            {
                actuarialFirm: 'DELOITTE',
                name: 'Actuary Contact 1',
                titleRole: 'Test Actuary Contact 1',
                email: 'actuarycontact1@test.com',
            },
        ],
        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
    }
}

function mockNewDraft(): DraftSubmission {
    return {
        __typename: 'DraftSubmission',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-124',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        name: 'MN-MSHO-0002',
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A real submission',
        documents: [],
        contractType: null,
        contractExecutionStatus: null,
        contractDocuments: [],
        contractDateStart: null,
        contractDateEnd: null,
        contractAmendmentInfo: null,
        managedCareEntities: [],
        federalAuthorities: [],
        rateType: null,
        rateDocuments: [],
        rateDateStart: null,
        rateDateEnd: null,
        rateDateCertified: null,
        stateContacts: [],
        actuaryContacts: [],
        actuaryCommunicationPreference: null,
    }
}

export function mockStateSubmission(): StateSubmission {
    return {
        __typename: 'StateSubmission',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-125',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        name: 'MN-MSHO-0003',
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A submitted submission',
        submittedAt: new Date(),
        documents: [
            {
                s3URL: 's3://bucketname/key/supporting-documents',
                name: 'supporting documents',
                documentCategories: ['RATES_RELATED' as const],
            },
        ],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [
            {
                s3URL: 's3://bucketname/key/contract',
                name: 'contract',
                documentCategories: ['CONTRACT' as const],
            },
        ],
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
        contractAmendmentInfo: null,
        managedCareEntities: ['ENROLLMENT_PROCESS'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: 'NEW',
        rateDocuments: [
            {
                s3URL: 's3://bucketname/key/rate',
                name: 'rate',
                documentCategories: ['RATES' as const],
            },
        ],
        rateDateStart: new Date(),
        rateDateEnd: new Date(),
        rateDateCertified: new Date(),
        rateAmendmentInfo: null,
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test@test.com',
            },
        ],
        actuaryContacts: [],
        actuaryCommunicationPreference: null,
    }
}

export function mockMNState(): State {
    return {
        name: 'Minnesota',
        programs: [
            {
                id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                name: 'SNBC',
            },
            {
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                name: 'PMAP',
            },
            {
                id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                name: 'MSC+',
            },
            {
                id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                name: 'MSHO',
            },
        ],
        code: 'MN',
    }
}

export function mockDraftHealthPlanPackage(
    submissionData?: Partial<UnlockedHealthPlanFormDataType>
): HealthPlanPackage {
    const submission = { ...basicHealthPlanFormData(), ...submissionData }
    const b64 = domainToBase64(submission)

    return {
        __typename: 'HealthPlanPackage',
        id: 'test-id-123',
        status: 'DRAFT',
        intiallySubmittedAt: '2022-01-01',
        stateCode: 'MN',
        state: mockMNState(),
        revisions: [
            {
                node: {
                    id: 'revision1',
                    unlockInfo: null,
                    createdAt: '2019-01-01',
                    submitInfo: null,
                    submissionData: b64,
                },
            },
        ],
    }
}

export function mockSubmittedHealthPlanPackage(): HealthPlanPackage {
    // get a submitted DomainModel submission
    // turn it into proto
    const submission = basicLockedHealthPlanFormData()
    const b64 = domainToBase64(submission)

    return {
        id: 'test-id-123',
        status: 'SUBMITTED',
        intiallySubmittedAt: '2022-01-01',
        stateCode: 'MN',
        state: mockMNState(),
        revisions: [
            {
                node: {
                    id: 'revision1',
                    createdAt: new Date(),
                    unlockInfo: null,
                    submitInfo: {
                        updatedAt: '2021-01-01',
                        updatedBy: 'test@example.com',
                        updatedReason: 'Initial submit',
                    },
                    submissionData: b64,
                },
            },
        ],
    }
}

export function mockSubmittedHealthPlanPackageWithRevisions(): HealthPlanPackage {
    // get a submitted DomainModel submission
    // turn it into proto
    const submission = basicLockedHealthPlanFormData()
    const b64 = domainToBase64(submission)

    return {
        id: 'test-id-123',
        status: 'RESUBMITTED',
        intiallySubmittedAt: '2022-01-01',
        stateCode: 'MN',
        state: mockMNState(),
        revisions: [
            {
                node: {
                    id: 'sd596de8-852d-4e42-ab0a-c9c9bf78c3c1',
                    unlockInfo: {
                        updatedAt: '2022-03-25T01:18:44.663Z',
                        updatedBy: 'zuko@example.com',
                        updatedReason: 'Latest unlock',
                    },
                    submitInfo: {
                        updatedAt: '2022-03-25T01:19:46.154Z',
                        updatedBy: 'aang@example.com',
                        updatedReason: 'Should be latest resubmission',
                        __typename: 'UpdateInformation',
                    },
                    createdAt: '2022-03-25T01:18:44.665Z',
                    submissionData: b64,
                },
            },
            {
                node: {
                    id: '26596de8-852d-4e42-bb0a-c9c9bf78c3de',
                    unlockInfo: {
                        updatedAt: '2022-03-24T01:18:44.663Z',
                        updatedBy: 'zuko@example.com',
                        updatedReason: 'testing stuff',
                    },
                    submitInfo: {
                        updatedAt: '2022-03-24T01:19:46.154Z',
                        updatedBy: 'aang@example.com',
                        updatedReason: 'Placeholder resubmission reason',
                    },
                    createdAt: '2022-03-24T01:18:44.665Z',
                    submissionData: b64,
                },
            },
            {
                node: {
                    id: 'e048cdcf-5b19-4acb-8ead-d7dc2fd6cd30',
                    unlockInfo: null,
                    submitInfo: {
                        updatedAt: '2022-03-23T02:08:52.259Z',
                        updatedBy: 'aang@example.com',
                        updatedReason: 'Initial submission',
                    },
                    createdAt: '2022-03-23T02:08:14.241Z',
                    submissionData: b64,
                },
            },
        ],
    }
}

export function mockUnlockedHealthPlanPackage(
    submissionData?: Partial<UnlockedHealthPlanFormDataType>
): HealthPlanPackage {
    const submission = {
        ...unlockedWithALittleBitOfEverything(),
        ...submissionData,
    }
    const b64 = domainToBase64(submission)

    return {
        id: 'test-id-123',
        status: 'UNLOCKED',
        intiallySubmittedAt: '2020-01-01',
        stateCode: 'MN',
        state: mockMNState(),
        revisions: [
            {
                node: {
                    id: 'revision2',
                    createdAt: new Date(),
                    unlockInfo: {
                        updatedAt: new Date(),
                        updatedBy: 'bob@dmas.mn.gov',
                        updatedReason: 'Test unlock reason',
                    },
                    submitInfo: null,
                    submissionData: b64,
                },
            },
            {
                node: {
                    id: 'revision1',
                    createdAt: new Date('2020-01-01'),
                    unlockInfo: null,
                    submitInfo: {
                        updatedAt: '2021-01-01',
                        updatedBy: 'test@example.com',
                        updatedReason: 'Initial submit',
                    },
                    submissionData: b64,
                },
            },
        ],
    }
}

type fetchCurrentUserMockProps = {
    user?: UserType | Partial<UserType>
    statusCode: 200 | 403 | 500
}
const fetchCurrentUserMock = ({
    user = mockValidUser(),
    statusCode,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
fetchCurrentUserMockProps): MockedResponse<Record<string, any>> => {
    switch (statusCode) {
        case 200:
            return {
                request: { query: FetchCurrentUserDocument },
                result: {
                    data: {
                        fetchCurrentUser: user,
                    },
                },
            }
        case 403:
            return {
                request: { query: FetchCurrentUserDocument },
                error: new Error('You are not logged in'),
            }
        default:
            return {
                request: { query: FetchCurrentUserDocument },
                error: new Error('A network error occurred'),
            }
    }
}

type createDraftSubmissionMockProps = {
    input: {
        programIDs: string[]
        submissionType: string
        submissionDescription: string
    }
    draftSubmission?: DraftSubmission | Partial<DraftSubmission>
    statusCode: 200 | 403 | 500
}

const createDraftSubmissionMock = ({
    input,
    draftSubmission = mockNewDraft(),
    statusCode, // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: createDraftSubmissionMockProps): MockedResponse<Record<string, any>> => {
    const mergedDraftSubmission = Object.assign({}, draftSubmission, input)
    switch (statusCode) {
        case 200:
            return {
                request: {
                    query: CreateDraftSubmissionDocument,
                    variables: { input },
                },
                result: {
                    data: {
                        createDraftSubmission: {
                            draftSubmission: mergedDraftSubmission,
                        },
                    },
                },
            }
        case 403:
            return {
                request: { query: CreateDraftSubmissionDocument },
                error: new Error('You are not logged in'),
            }
        default:
            return {
                request: { query: CreateDraftSubmissionDocument },
                error: new Error('A network error occurred'),
            }
    }
}

type fetchHealthPlanPackageMockProps = {
    submission?: HealthPlanPackage | Partial<HealthPlanPackage>
    id: string
    statusCode: 200 | 403 | 500
}

const fetchHealthPlanPackageMock = ({
    submission = mockDraftHealthPlanPackage(),
    id,
    statusCode, // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: fetchHealthPlanPackageMockProps): MockedResponse<Record<string, any>> => {
    // override the ID of the returned draft to match the queried id.
    const mergedDraftSubmission = Object.assign({}, submission, { id })

    switch (statusCode) {
        case 200:
            return {
                request: {
                    query: FetchHealthPlanPackageDocument,
                    variables: { input: { submissionID: id } },
                },
                result: {
                    data: {
                        fetchHealthPlanPackage: {
                            submission: mergedDraftSubmission,
                        },
                    },
                },
            }
        case 403:
            return {
                request: { query: FetchHealthPlanPackageDocument },
                error: new Error('You are not logged in'),
            }
        default:
            return {
                request: { query: FetchHealthPlanPackageDocument },
                error: new Error('A network error occurred'),
            }
    }
}

type fetchStateSubmissionMockProps = {
    stateSubmission?: StateSubmission | Partial<StateSubmission>
    id: string
    statusCode: 200 | 403 | 500
}

type fetchStateHealthPlanPackageMockSuccessProps = {
    stateSubmission?: HealthPlanPackage | Partial<HealthPlanPackage>
    id: string
}

const fetchStateHealthPlanPackageMockSuccess = ({
    stateSubmission = mockSubmittedHealthPlanPackage(),
    id,
}: fetchStateHealthPlanPackageMockSuccessProps): MockedResponse<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Record<string, any>
> => {
    // override the ID of the returned draft to match the queried id.
    const mergedStateSubmission = Object.assign({}, stateSubmission, { id })

    return {
        request: {
            query: FetchHealthPlanPackageDocument,
            variables: { input: { submissionID: id } },
        },
        result: {
            data: {
                fetchHealthPlanPackage: {
                    submission: mergedStateSubmission,
                },
            },
        },
    }
}

const fetchStateSubmissionMock = ({
    stateSubmission = mockStateSubmission(),
    id,
    statusCode, // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: fetchStateSubmissionMockProps): MockedResponse<Record<string, any>> => {
    // override the ID of the returned draft to match the queried id.
    console.log('MOCKING', id)
    const mergedStateSubmission = Object.assign({}, stateSubmission, { id })
    switch (statusCode) {
        case 200:
            return {
                request: {
                    query: FetchStateSubmissionDocument,
                    variables: { input: { submissionID: id } },
                },
                result: {
                    data: {
                        fetchStateSubmission: {
                            submission: mergedStateSubmission,
                        },
                    },
                },
            }
        case 403:
            return {
                request: { query: FetchHealthPlanPackageDocument },
                error: new Error('You are not logged in'),
            }
        default:
            return {
                request: { query: FetchHealthPlanPackageDocument },
                error: new Error('A network error occurred'),
            }
    }
}

const mockSubmittedHealthPlanPackageWithRevision = (): HealthPlanPackage => {
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
        intiallySubmittedAt: '2022-03-25',
        revisions: [
            {
                __typename: 'HealthPlanRevisionEdge',
                node: {
                    __typename: 'HealthPlanRevision',
                    id: '135972bf-e056-40d3-859c-6a69d9c982ad',
                    unlockInfo: {
                        __typename: 'UpdateInformation',
                        updatedAt: '2022-03-28T17:54:39.173Z',
                        updatedBy: 'zuko@example.com',
                        updatedReason: 'prepare to add documents',
                    },
                    submitInfo: {
                        __typename: 'UpdateInformation',
                        updatedAt: '2022-03-28T17:56:32.952Z',
                        updatedBy: 'aang@example.com',
                        updatedReason: 'Placeholder resubmission reason',
                    },
                    createdAt: '2022-03-28T17:54:39.175Z',
                    submissionData:
                        'ChBTVEFURV9TVUJNSVNTSU9OEAEaJDA3ZjllZmJmLWQ0ZDEtNDRhZS04Njc0LTU2ZDlkNmI3NWNlNiIJU1VCTUlUVEVEKgcI5g8QAhgZMgwI0O2HkgYQwMC2xgM6DAjQ7YeSBhCAvPnFA0gYUBJaBHBtYXBgA2onZGVzY3JpcHRpb24gb2YgY29udHJhY3Qgb25seSBzdWJtaXNzaW9uchUKAWESAWEaDWFAZXhhbXBsZS5jb2168AEIARIHCOYPEAIYBRoHCOYPEAIYEyIBASoBATJ0ChlBbWVyaWdyb3VwIFRleGFzLCBJbmMucGRmElRzMzovL2xvY2FsLXVwbG9hZHMvMTY0ODI0MjYzMjE1Ny1BbWVyaWdyb3VwIFRleGFzLCBJbmMucGRmL0FtZXJpZ3JvdXAgVGV4YXMsIEluYy5wZGYaAQEyXAoRbGlmZW9mZ2FsaWxlby5wZGYSRHMzOi8vbG9jYWwtdXBsb2Fkcy8xNjQ4NDkwMTYyNjQxLWxpZmVvZmdhbGlsZW8ucGRmL2xpZmVvZmdhbGlsZW8ucGRmGgEBOAGCAYABCh1BbWVyaWdyb3VwIFRleGFzIEluYyBjb3B5LnBkZhJcczM6Ly9sb2NhbC11cGxvYWRzLzE2NDgyNDI3MTE0MjEtQW1lcmlncm91cCBUZXhhcyBJbmMgY29weS5wZGYvQW1lcmlncm91cCBUZXhhcyBJbmMgY29weS5wZGYaAQOCAbcBCi81MjktMTAtMDAyMC0wMDAwM19TdXBlcmlvcl9IZWFsdGggUGxhbiwgSW5jLnBkZhKAAXMzOi8vbG9jYWwtdXBsb2Fkcy8xNjQ4MjQyNzExNDIxLTUyOS0xMC0wMDIwLTAwMDAzX1N1cGVyaW9yX0hlYWx0aCBQbGFuLCBJbmMucGRmLzUyOS0xMC0wMDIwLTAwMDAzX1N1cGVyaW9yX0hlYWx0aCBQbGFuLCBJbmMucGRmGgEEggGbAQomY292aWQtaWZjLTItZmx1LXJzdi1jb2RlcyA1LTUtMjAyMS5wZGYSbnMzOi8vbG9jYWwtdXBsb2Fkcy8xNjQ4MjQyODczMjI5LWNvdmlkLWlmYy0yLWZsdS1yc3YtY29kZXMgNS01LTIwMjEucGRmL2NvdmlkLWlmYy0yLWZsdS1yc3YtY29kZXMgNS01LTIwMjEucGRmGgEEkgOyARABGgcI5g8QAhgZIgcI5g8QAhgaKgcI5g8QAhgZMhsKFQoBYhIBYhoNYkBleGFtcGxlLmNvbRABGgA4AUJ0ChlBbWVyaWdyb3VwIFRleGFzLCBJbmMucGRmElRzMzovL2xvY2FsLXVwbG9hZHMvMTY0ODI0MjY2NTYzNC1BbWVyaWdyb3VwIFRleGFzLCBJbmMucGRmL0FtZXJpZ3JvdXAgVGV4YXMsIEluYy5wZGYaAQI=', //pragma: allowlist secret
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
                        updatedBy: 'zuko@example.com',
                        updatedReason: 'test',
                    },
                    submitInfo: {
                        __typename: 'UpdateInformation',
                        updatedAt: '2022-03-25T21:14:43.057Z',
                        updatedBy: 'aang@example.com',
                        updatedReason: 'Placeholder resubmission reason',
                    },
                    createdAt: '2022-03-25T21:13:56.176Z',
                    submissionData:
                        'ChBTVEFURV9TVUJNSVNTSU9OEAEaJDA3ZjllZmJmLWQ0ZDEtNDRhZS04Njc0LTU2ZDlkNmI3NWNlNiIJU1VCTUlUVEVEKgcI5g8QAhgZMgsIw+H4kQYQwICXGzoLCMPh+JEGEMCAlxtIGFASWgRwbWFwYANqJ2Rlc2NyaXB0aW9uIG9mIGNvbnRyYWN0IG9ubHkgc3VibWlzc2lvbnIVCgFhEgFhGg1hQGV4YW1wbGUuY29tepIBCAESBwjmDxACGAUaBwjmDxACGBMiAQEqAQEydAoZQW1lcmlncm91cCBUZXhhcywgSW5jLnBkZhJUczM6Ly9sb2NhbC11cGxvYWRzLzE2NDgyNDI2MzIxNTctQW1lcmlncm91cCBUZXhhcywgSW5jLnBkZi9BbWVyaWdyb3VwIFRleGFzLCBJbmMucGRmGgEBOAGCAYABCh1BbWVyaWdyb3VwIFRleGFzIEluYyBjb3B5LnBkZhJcczM6Ly9sb2NhbC11cGxvYWRzLzE2NDgyNDI3MTE0MjEtQW1lcmlncm91cCBUZXhhcyBJbmMgY29weS5wZGYvQW1lcmlncm91cCBUZXhhcyBJbmMgY29weS5wZGYaAQOCAbcBCi81MjktMTAtMDAyMC0wMDAwM19TdXBlcmlvcl9IZWFsdGggUGxhbiwgSW5jLnBkZhKAAXMzOi8vbG9jYWwtdXBsb2Fkcy8xNjQ4MjQyNzExNDIxLTUyOS0xMC0wMDIwLTAwMDAzX1N1cGVyaW9yX0hlYWx0aCBQbGFuLCBJbmMucGRmLzUyOS0xMC0wMDIwLTAwMDAzX1N1cGVyaW9yX0hlYWx0aCBQbGFuLCBJbmMucGRmGgEEggGbAQomY292aWQtaWZjLTItZmx1LXJzdi1jb2RlcyA1LTUtMjAyMS5wZGYSbnMzOi8vbG9jYWwtdXBsb2Fkcy8xNjQ4MjQyODczMjI5LWNvdmlkLWlmYy0yLWZsdS1yc3YtY29kZXMgNS01LTIwMjEucGRmL2NvdmlkLWlmYy0yLWZsdS1yc3YtY29kZXMgNS01LTIwMjEucGRmGgEEkgOyARABGgcI5g8QAhgZIgcI5g8QAhgaKgcI5g8QAhgZMhsKFQoBYhIBYhoNYkBleGFtcGxlLmNvbRABGgA4AUJ0ChlBbWVyaWdyb3VwIFRleGFzLCBJbmMucGRmElRzMzovL2xvY2FsLXVwbG9hZHMvMTY0ODI0MjY2NTYzNC1BbWVyaWdyb3VwIFRleGFzLCBJbmMucGRmL0FtZXJpZ3JvdXAgVGV4YXMsIEluYy5wZGYaAQI=', // pragma: allowlist secret
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
                        updatedAt: '2022-03-25T21:13:20.419Z',
                        updatedBy: 'aang@example.com',
                        updatedReason: 'Initial submission',
                    },
                    createdAt: '2022-03-25T03:28:56.244Z',
                    submissionData:
                        'ChBTVEFURV9TVUJNSVNTSU9OEAEaJDA3ZjllZmJmLWQ0ZDEtNDRhZS04Njc0LTU2ZDlkNmI3NWNlNiIJU1VCTUlUVEVEKgcI5g8QAhgZMgwI8OD4kQYQgOKiyAE6DAjw4PiRBhDA3eXHAUgYUBJaBHBtYXBgA2onZGVzY3JpcHRpb24gb2YgY29udHJhY3Qgb25seSBzdWJtaXNzaW9uchUKAWESAWEaDWFAZXhhbXBsZS5jb216kgEIARIHCOYPEAIYBRoHCOYPEAIYEyIBASoBATJ0ChlBbWVyaWdyb3VwIFRleGFzLCBJbmMucGRmElRzMzovL2xvY2FsLXVwbG9hZHMvMTY0ODI0MjYzMjE1Ny1BbWVyaWdyb3VwIFRleGFzLCBJbmMucGRmL0FtZXJpZ3JvdXAgVGV4YXMsIEluYy5wZGYaAQE4AYIBgAEKHUFtZXJpZ3JvdXAgVGV4YXMgSW5jIGNvcHkucGRmElxzMzovL2xvY2FsLXVwbG9hZHMvMTY0ODI0MjcxMTQyMS1BbWVyaWdyb3VwIFRleGFzIEluYyBjb3B5LnBkZi9BbWVyaWdyb3VwIFRleGFzIEluYyBjb3B5LnBkZhoBA4IBtwEKLzUyOS0xMC0wMDIwLTAwMDAzX1N1cGVyaW9yX0hlYWx0aCBQbGFuLCBJbmMucGRmEoABczM6Ly9sb2NhbC11cGxvYWRzLzE2NDgyNDI3MTE0MjEtNTI5LTEwLTAwMjAtMDAwMDNfU3VwZXJpb3JfSGVhbHRoIFBsYW4sIEluYy5wZGYvNTI5LTEwLTAwMjAtMDAwMDNfU3VwZXJpb3JfSGVhbHRoIFBsYW4sIEluYy5wZGYaAQSSA7IBEAEaBwjmDxACGBkiBwjmDxACGBoqBwjmDxACGBkyGwoVCgFiEgFiGg1iQGV4YW1wbGUuY29tEAEaADgBQnQKGUFtZXJpZ3JvdXAgVGV4YXMsIEluYy5wZGYSVHMzOi8vbG9jYWwtdXBsb2Fkcy8xNjQ4MjQyNjY1NjM0LUFtZXJpZ3JvdXAgVGV4YXMsIEluYy5wZGYvQW1lcmlncm91cCBUZXhhcywgSW5jLnBkZhoBAg==', // pragma: allowlist secret
                },
            },
        ],
    }
}

type updateDraftSubmissionMockProps = {
    draftSubmission?: DraftSubmission | Partial<DraftSubmission>
    id: string
    updates: DraftSubmissionUpdates | Partial<DraftSubmissionUpdates>
    statusCode: 200 | 403 | 500
}

const updateDraftSubmissionMock = ({
    id,
    updates,
    statusCode, // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: updateDraftSubmissionMockProps): MockedResponse<Record<string, any>> => {
    const mergedDraftSubmission = Object.assign(
        {},
        mockDraft(),
        updates,
        { id } // make sure the id matches what we queried
    )
    switch (statusCode) {
        case 200:
            return {
                request: {
                    query: UpdateDraftSubmissionDocument,
                    variables: {
                        input: {
                            submissionID: id,
                            draftSubmissionUpdates: updates,
                        },
                    },
                },
                // error: new Error('You are not logged in'),
                result: {
                    data: {
                        updateDraftSubmission: {
                            draftSubmission: mergedDraftSubmission,
                        },
                    },
                },
            }
        case 403:
            return {
                request: { query: UpdateDraftSubmissionDocument },
                error: new Error('You are not logged in'),
            }
        default:
            return {
                request: { query: UpdateDraftSubmissionDocument },
                error: new Error('A network error occurred'),
            }
    }
}

type submitDraftSubmissionMockSuccessProps = {
    stateSubmission?: StateSubmission | Partial<StateSubmission>
    id: string
    submittedReason?: string
}

const submitDraftSubmissionMockSuccess = ({
    stateSubmission,
    id,
    submittedReason,
}: submitDraftSubmissionMockSuccessProps): MockedResponse<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Record<string, any>
> => {
    const submission = stateSubmission ?? mockDraft()
    return {
        request: {
            query: SubmitHealthPlanPackageDocument,
            variables: { input: { submissionID: id, submittedReason } },
        },
        result: { data: { submitDraftSubmission: { submission: submission } } },
    }
}

const submitDraftSubmissionMockError = ({
    id,
}: {
    id: string // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): MockedResponse<Record<string, any>> => {
    return {
        request: {
            query: SubmitHealthPlanPackageDocument,
            variables: { input: { submissionID: id } },
        },
        result: {
            errors: [
                new GraphQLError('Incomplete submission cannot be submitted'),
            ],
        },
    }
}

type unlockStateSubmissionMockSuccessProps = {
    submission?: HealthPlanPackage | Partial<HealthPlanPackage>
    id: string
    reason: string
}

const unlockStateSubmissionMockSuccess = ({
    submission = mockUnlockedHealthPlanPackage(),
    id,
    reason,
}: unlockStateSubmissionMockSuccessProps): MockedResponse<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Record<string, any>
> => {
    return {
        request: {
            query: UnlockHealthPlanPackageDocument,
            variables: { input: { submissionID: id, unlockedReason: reason } },
        },
        result: { data: { unlockStateSubmission: { submission } } },
    }
}

const unlockStateSubmissionMockError = ({
    id,
    reason,
}: {
    id: string
    reason: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): MockedResponse<Record<string, any>> => {
    return {
        request: {
            query: UnlockHealthPlanPackageDocument,
            variables: { input: { submissionID: id, unlockedReason: reason } },
        },
        result: {
            errors: [
                new GraphQLError('Incomplete submission cannot be submitted'),
            ],
        },
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const indexSubmissionsMockSuccess = (
    submissions: Submission[] = [mockDraft(), mockStateSubmission()]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): MockedResponse<Record<string, any>> => {
    const submissionEdges = submissions.map((sub) => {
        return {
            node: sub,
        }
    })
    return {
        request: {
            query: IndexSubmissionsDocument,
        },
        result: {
            data: {
                indexSubmissions: {
                    totalCount: submissionEdges.length,
                    edges: submissionEdges,
                },
            },
        },
    }
}

const indexHealthPlanPackagesMockSuccess = (
    submissions: HealthPlanPackage[] = [
        mockUnlockedHealthPlanPackage(),
        mockSubmittedHealthPlanPackage(),
    ]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): MockedResponse<Record<string, any>> => {
    const submissionEdges = submissions.map((sub) => {
        return {
            node: sub,
        }
    })
    return {
        request: {
            query: IndexHealthPlanPackagesDocument,
        },
        result: {
            data: {
                indexHealthPlanPackages: {
                    totalCount: submissionEdges.length,
                    edges: submissionEdges,
                },
            },
        },
    }
}

export {
    fetchCurrentUserMock,
    mockValidCMSUser,
    createDraftSubmissionMock,
    fetchHealthPlanPackageMock,
    fetchStateSubmissionMock,
    fetchStateHealthPlanPackageMockSuccess,
    updateDraftSubmissionMock,
    submitDraftSubmissionMockSuccess,
    submitDraftSubmissionMockError,
    indexSubmissionsMockSuccess,
    indexHealthPlanPackagesMockSuccess,
    unlockStateSubmissionMockSuccess,
    unlockStateSubmissionMockError,
    mockSubmittedHealthPlanPackageWithRevision,
}
