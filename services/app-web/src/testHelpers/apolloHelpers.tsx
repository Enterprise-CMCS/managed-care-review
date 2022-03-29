import { MockedResponse } from '@apollo/client/testing'
import dayjs from 'dayjs'
import { GraphQLError } from 'graphql'
import {
    basicStateSubmission,
    basicSubmission,
    draftWithALittleBitOfEverything
} from '../common-code/domain-mocks'
import {
    DraftSubmissionType
} from '../common-code/domain-models'
import { domainToBase64 } from '../common-code/proto/stateSubmission'
import {
    CreateDraftSubmissionDocument,
    DraftSubmission,
    DraftSubmissionUpdates,
    FetchCurrentUserDocument,
    FetchStateSubmissionDocument,
    FetchSubmission2Document, IndexSubmissions2Document, IndexSubmissionsDocument,
    State,
    StateSubmission,
    Submission,
    Submission2, SubmitDraftSubmissionDocument,
    UnlockStateSubmissionDocument,
    UpdateDraftSubmissionDocument,
    User as UserType
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
      "name": "Minnesota",
      "programs": [
        {
          "id": "abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce",
          "name": "SNBC"
        },
        {
          "id": "d95394e5-44d1-45df-8151-1cc1ee66f100",
          "name": "PMAP"
        },
        {
          "id": "ea16a6c0-5fc6-4df8-adac-c627e76660ab",
          "name": "MSC+"
        },
        {
          "id": "3fd36500-bf2c-47bc-80e8-e7aa417184c5",
          "name": "MSHO"
        }
      ],
      "code": "MN"
    }
}

export function mockDraftSubmission2(submissionData?: Partial<DraftSubmissionType>): Submission2 {
    const submission = {...basicSubmission(), ...submissionData}
    const b64 = domainToBase64(submission)

    return {
        __typename: "Submission2",
        id: 'test-id-123',
        status: 'DRAFT',
        intiallySubmittedAt: '2022-01-01',
        stateCode: 'MN',
        state: mockMNState(),
        revisions: [
            {
                revision: {
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

export function mockSubmittedSubmission2(): Submission2 {

    // get a submitted DomainModel submission
    // turn it into proto
    const submission = basicStateSubmission()
    const b64 = domainToBase64(submission)

    return {
        id: 'test-id-123',
        status: 'SUBMITTED',
        intiallySubmittedAt: '2022-01-01',
        stateCode: 'MN',
        state: mockMNState(),
        revisions: [
            {
                revision: {
                    id: 'revision1',
                    createdAt: new Date(),
                    unlockInfo: null,
                    submitInfo: {
                        updatedAt: "2021-01-01",
                        updatedBy: 'test@example.com',
                        updatedReason: 'Initial submit'
            },
                    submissionData: b64,
                }
            },
        ]
    }
}

export function mockUnlockedSubmission2(
    submissionData?: Partial<DraftSubmissionType>
): Submission2 {

    const submission = {
        ...draftWithALittleBitOfEverything(),
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
                revision: {
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
                revision: {
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

type fetchSubmission2MockProps = {
    submission?: Submission2 | Partial<Submission2>
    id: string
    statusCode: 200 | 403 | 500
}

const fetchSubmission2Mock = ({
    submission = mockDraftSubmission2(),
    id,
    statusCode, // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: fetchSubmission2MockProps): MockedResponse<Record<string, any>> => {
    // override the ID of the returned draft to match the queried id.
    const mergedDraftSubmission = Object.assign({}, submission, { id })

    switch (statusCode) {
        case 200:
            return {
                request: {
                    query: FetchSubmission2Document,
                    variables: { input: { submissionID: id } },
                },
                result: {
                    data: {
                        fetchSubmission2: {
                            submission: mergedDraftSubmission,
                        },
                    },
                },
            }
        case 403:
            return {
                request: { query: FetchSubmission2Document },
                error: new Error('You are not logged in'),
            }
        default:
            return {
                request: { query: FetchSubmission2Document },
                error: new Error('A network error occurred'),
            }
    }
}

type fetchStateSubmissionMockProps = {
    stateSubmission?: StateSubmission | Partial<StateSubmission>
    id: string
    statusCode: 200 | 403 | 500
}


type fetchStateSubmission2MockSuccessProps = {
    stateSubmission?: Submission2 | Partial<Submission2>
    id: string
}

const fetchStateSubmission2MockSuccess = ({
    stateSubmission = mockSubmittedSubmission2(),
    id, // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: fetchStateSubmission2MockSuccessProps): MockedResponse<Record<string, any>> => {
    // override the ID of the returned draft to match the queried id.
    const mergedStateSubmission = Object.assign({}, stateSubmission, { id })

    return {
        request: {
            query: FetchSubmission2Document,
            variables: { input: { submissionID: id } },
        },
        result: {
            data: {
                fetchSubmission2: {
                    submission: mergedStateSubmission
                },
            },
        }
    }
}

const fetchStateSubmissionMock = ({
    stateSubmission = mockStateSubmission(),
    id,
    statusCode, // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: fetchStateSubmissionMockProps): MockedResponse<Record<string, any>> => {
    // override the ID of the returned draft to match the queried id.
    console.log("MOCKING", id)
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
                request: { query: FetchSubmission2Document },
                error: new Error('You are not logged in'),
            }
        default:
            return {
                request: { query: FetchSubmission2Document },
                error: new Error('A network error occurred'),
            }
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
            query: SubmitDraftSubmissionDocument,
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
            query: SubmitDraftSubmissionDocument,
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
    submission?: Submission2 | Partial<Submission2>
    id: string
    reason: string
}

const unlockStateSubmissionMockSuccess = ({
    submission = mockUnlockedSubmission2(),
    id,
    reason,
}: unlockStateSubmissionMockSuccessProps): MockedResponse<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Record<string, any>
> => {
    return {
        request: {
            query: UnlockStateSubmissionDocument,
            variables: { input: { submissionID: id, unlockedReason: reason } },
        },
        result: { data: { unlockStateSubmission: { submission } } },
    }
}

const unlockStateSubmissionMockError = ({
    id,
    reason
}: {
    id: string // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reason: string
}): MockedResponse<Record<string, any>> => {
    return {
        request: {
            query: UnlockStateSubmissionDocument,
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

const indexSubmissions2MockSuccess = (
    submissions: Submission2[] = [mockUnlockedSubmission2(), mockSubmittedSubmission2()]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): MockedResponse<Record<string, any>> => {
    
    const submissionEdges = submissions.map((sub) => {
        return {
            node: sub,
        }
    })
    return {
        request: {
            query: IndexSubmissions2Document,
        },
        result: {
            data: {
                indexSubmissions2: {
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
    fetchSubmission2Mock,
    fetchStateSubmissionMock,
    fetchStateSubmission2MockSuccess,
    updateDraftSubmissionMock,
    submitDraftSubmissionMockSuccess,
    submitDraftSubmissionMockError,
    indexSubmissionsMockSuccess,
    indexSubmissions2MockSuccess,
    unlockStateSubmissionMockSuccess,
    unlockStateSubmissionMockError,
}
