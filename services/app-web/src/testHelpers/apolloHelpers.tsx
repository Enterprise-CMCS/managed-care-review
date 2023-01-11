import { MockedResponse } from '@apollo/client/testing'
import dayjs from 'dayjs'
import { GraphQLError } from 'graphql'
import {
    basicLockedHealthPlanFormData,
    basicHealthPlanFormData,
    unlockedWithALittleBitOfEverything,
} from '../common-code/healthPlanFormDataMocks'

import {
    LockedHealthPlanFormDataType,
    SubmissionDocument,
    UnlockedHealthPlanFormDataType,
} from '../common-code/healthPlanFormDataType'
import {
    domainToBase64,
    protoToBase64,
} from '../common-code/proto/healthPlanFormDataProto'
import {
    FetchCurrentUserDocument,
    FetchHealthPlanPackageDocument,
    UpdateHealthPlanFormDataDocument,
    IndexHealthPlanPackagesDocument,
    State,
    HealthPlanPackage,
    SubmitHealthPlanPackageDocument,
    UnlockHealthPlanPackageDocument,
    User as UserType,
    UnlockHealthPlanPackageMutation,
    SubmitHealthPlanPackageMutation,
    IndexHealthPlanPackagesQuery,
    FetchHealthPlanPackageQuery,
    UpdateHealthPlanFormDataMutation,
    CreateHealthPlanPackageDocument,
    CreateHealthPlanPackageMutation,
    UpdateInformation,
} from '../gen/gqlClient'

/* For use with Apollo MockedProvider in jest tests */
function mockValidUser(): UserType {
    return {
        __typename: 'StateUser' as const,
        state: mockMNState(),
        role: 'STATE_USER',
        email: 'bob@dmas.mn.gov',
    }
}

function mockValidCMSUser(): UserType {
    return {
        __typename: 'CMSUser' as const,
        role: 'CMS_USER',
        email: 'bob@dmas.mn.gov',
        stateAssignments: [],
    }
}

export function mockDraft(): UnlockedHealthPlanFormDataType {
    return {
        status: 'DRAFT',
        stateNumber: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        submissionType: 'CONTRACT_ONLY',
        riskBasedContract: false,
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: dayjs().add(2, 'days').toDate(),
        contractAmendmentInfo: undefined,
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateInfos: [],
        stateContacts: [],
        addtlActuaryContacts: [],
        addtlActuaryCommunicationPreference: undefined,
    }
}

export function mockContactAndRatesDraft(): UnlockedHealthPlanFormDataType {
    return {
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: dayjs().add(2, 'days').toDate(),
        contractAmendmentInfo: undefined,
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateInfos: [
            {
                rateType: 'NEW',
                rateCapitationType: 'RATE_CELL',
                rateDocuments: [],
                rateDateStart: new Date(),
                rateDateEnd: new Date(),
                rateDateCertified: new Date(),
                rateAmendmentInfo: undefined,
                actuaryContacts: [],
                packagesWithSharedRateCerts: [],
            },
        ],
        stateContacts: [],
        addtlActuaryContacts: [],
        addtlActuaryCommunicationPreference: undefined,
        status: 'DRAFT',
        stateNumber: 5,
    }
}

export function mockCompleteDraft(): UnlockedHealthPlanFormDataType {
    return {
        status: 'DRAFT',
        stateNumber: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        submissionType: 'CONTRACT_ONLY',
        riskBasedContract: true,
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
        contractAmendmentInfo: undefined,
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateInfos: [
            {
                rateType: 'NEW',
                rateCapitationType: 'RATE_CELL',
                rateDocuments: [],
                rateDateStart: new Date(),
                rateDateEnd: new Date(),
                rateDateCertified: new Date(),
                rateAmendmentInfo: undefined,
                actuaryContacts: [],
                packagesWithSharedRateCerts: [],
            },
        ],
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test@test.com',
            },
        ],
        addtlActuaryContacts: [],
        addtlActuaryCommunicationPreference: undefined,
    }
}

export function mockContractAndRatesDraft(): UnlockedHealthPlanFormDataType {
    return {
        status: 'DRAFT',
        stateNumber: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['pmap'],
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'AMENDMENT',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
        contractAmendmentInfo: {
            modifiedProvisions: {
                modifiedBenefitsProvided: true,
                modifiedGeoAreaServed: false,
                modifiedMedicaidBeneficiaries: true,
                modifiedRiskSharingStrategy: true,
                modifiedIncentiveArrangements: false,
                modifiedWitholdAgreements: false,
                modifiedStateDirectedPayments: true,
                modifiedPassThroughPayments: true,
                modifiedPaymentsForMentalDiseaseInstitutions: false,
                modifiedMedicalLossRatioStandards: true,
                modifiedOtherFinancialPaymentIncentive: false,
                modifiedEnrollmentProcess: true,
                modifiedGrevienceAndAppeal: false,
                modifiedNetworkAdequacyStandards: true,
                modifiedLengthOfContract: false,
                modifiedNonRiskPaymentArrangements: true,
            },
        },
        managedCareEntities: ['MCO'],
        federalAuthorities: ['STATE_PLAN'],
        rateInfos: [
            {
                rateType: 'AMENDMENT',
                rateCapitationType: 'RATE_CELL',
                rateDocuments: [],
                rateDateStart: new Date(),
                rateDateEnd: new Date(),
                rateDateCertified: new Date(),
                rateAmendmentInfo: {
                    effectiveDateStart: new Date(),
                    effectiveDateEnd: new Date(),
                },
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@test.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
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
        addtlActuaryContacts: [
            {
                actuarialFirm: 'DELOITTE',
                name: 'Additional Actuary Contact',
                titleRole: 'Test Actuary Contact',
                email: 'additionalactuarycontact1@test.com',
            },
        ],
        addtlActuaryCommunicationPreference: 'OACT_TO_ACTUARY',
    }
}

export function mockStateSubmission(): LockedHealthPlanFormDataType {
    return {
        status: 'SUBMITTED',
        stateNumber: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-125',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
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
        contractAmendmentInfo: undefined,
        managedCareEntities: ['ENROLLMENT_PROCESS'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateInfos: [
            {
                rateType: 'NEW',
                rateCapitationType: 'RATE_CELL',
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
                rateAmendmentInfo: undefined,
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@test.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test@test.com',
            },
        ],
        addtlActuaryContacts: [],
        addtlActuaryCommunicationPreference: undefined,
    }
}

export function mockStateSubmissionContractAmendment(): LockedHealthPlanFormDataType {
    return {
        status: 'SUBMITTED',
        stateNumber: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-125',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A submitted submission',
        submittedAt: new Date(),
        documents: [
            {
                s3URL: 's3://bucketname/key/supporting-documents',
                name: 'supporting documents',
                documentCategories: ['RATES_RELATED' as const],
            },
        ],
        contractType: 'AMENDMENT',
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
        contractAmendmentInfo: {
            modifiedProvisions: {
                modifiedBenefitsProvided: true,
                modifiedGeoAreaServed: false,
                modifiedMedicaidBeneficiaries: true,
                modifiedRiskSharingStrategy: true,
                modifiedIncentiveArrangements: true,
                modifiedWitholdAgreements: false,
                modifiedStateDirectedPayments: false,
                modifiedPassThroughPayments: true,
                modifiedPaymentsForMentalDiseaseInstitutions: true,
                modifiedMedicalLossRatioStandards: true,
                modifiedOtherFinancialPaymentIncentive: false,
                modifiedEnrollmentProcess: true,
                modifiedGrevienceAndAppeal: false,
                modifiedNetworkAdequacyStandards: true,
                modifiedLengthOfContract: false,
                modifiedNonRiskPaymentArrangements: true,
            },
        },
        managedCareEntities: ['ENROLLMENT_PROCESS'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateInfos: [
            {
                rateType: 'NEW',
                rateCapitationType: 'RATE_CELL',
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
                rateAmendmentInfo: undefined,
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@test.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test@test.com',
            },
        ],
        addtlActuaryContacts: [],
        addtlActuaryCommunicationPreference: undefined,
    }
}

export function mockMNState(): State {
    return {
        name: 'Minnesota',
        programs: [
            {
                id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                fullName: 'Special Needs Basic Care',
                name: 'SNBC',
            },
            {
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                fullName: 'Prepaid Medical Assistance Program',
                name: 'PMAP',
            },
            {
                id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                fullName: 'Minnesota Senior Care Plus ',
                name: 'MSC+',
            },
            {
                id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                fullName: 'Minnesota Senior Health Options',
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
        initiallySubmittedAt: '2022-01-01',
        stateCode: 'MN',
        state: mockMNState(),
        revisions: [
            {
                node: {
                    id: 'revision1',
                    unlockInfo: null,
                    createdAt: '2019-01-01',
                    submitInfo: null,
                    formDataProto: b64,
                },
            },
        ],
    }
}

export function mockSubmittedHealthPlanPackage(
    submissionData?: Partial<UnlockedHealthPlanFormDataType>,
    submitInfo?: Partial<UpdateInformation>
): HealthPlanPackage {
    // get a submitted DomainModel submission
    // turn it into proto
    const submission = { ...basicLockedHealthPlanFormData(), ...submissionData }
    const b64 = domainToBase64(submission)

    return {
        id: 'test-id-123',
        status: 'SUBMITTED',
        initiallySubmittedAt: '2022-01-02',
        stateCode: 'MN',
        state: mockMNState(),
        revisions: [
            {
                node: {
                    id: 'revision1',
                    createdAt: new Date('2021-01-01'),
                    unlockInfo: null,
                    submitInfo: {
                        updatedAt: new Date('2021-01-02'),
                        updatedBy: 'test@example.com',
                        updatedReason: 'Initial submit',
                        ...submitInfo,
                    },
                    formDataProto: b64,
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
        initiallySubmittedAt: '2022-01-01',
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
                    formDataProto: b64,
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
                    formDataProto: b64,
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
                    formDataProto: b64,
                },
            },
        ],
    }
}

export function mockUnlockedHealthPlanPackage(
    submissionData?: Partial<UnlockedHealthPlanFormDataType>,
    unlockInfo?: Partial<UpdateInformation>
): HealthPlanPackage {
    const submission = {
        ...unlockedWithALittleBitOfEverything(),
        ...submissionData,
    }
    const b64 = domainToBase64(submission)
    const b64Previous = domainToBase64({
        ...unlockedWithALittleBitOfEverything(),
    })

    return {
        id: 'test-id-123',
        status: 'UNLOCKED',
        initiallySubmittedAt: '2020-01-01',
        stateCode: 'MN',
        state: mockMNState(),
        revisions: [
            {
                node: {
                    id: 'revision3',
                    createdAt: new Date(),
                    unlockInfo: {
                        updatedAt: new Date(),
                        updatedBy: 'bob@dmas.mn.gov',
                        updatedReason: 'Test unlock reason',
                        ...unlockInfo,
                    },
                    submitInfo: null,
                    formDataProto: b64,
                },
            },
            {
                node: {
                    id: 'revision2',
                    createdAt: new Date('2020-07-01'),
                    unlockInfo: {
                        updatedAt: new Date('2020-08-01'),
                        updatedBy: 'bob@dmas.mn.gov',
                        updatedReason: 'Test unlock reason',
                        ...unlockInfo,
                    },
                    submitInfo: {
                        updatedAt: new Date('2020-07-15'),
                        updatedBy: 'bob@dmas.mn.gov',
                        updatedReason: 'Second Submit',
                    },
                    formDataProto: b64Previous,
                },
            },
            {
                node: {
                    id: 'revision1',
                    createdAt: new Date('2020-01-01'),
                    unlockInfo: null,
                    submitInfo: {
                        updatedAt: new Date('2021-01-02'),
                        updatedBy: 'test@example.com',
                        updatedReason: 'Initial submit',
                    },
                    formDataProto: b64Previous,
                },
            },
        ],
    }
}

export function mockUnlockedHealthPlanPackageWithOldProtos(
    unlockedWithOldProto: Buffer
): HealthPlanPackage {
    // other mocks take a submission and convert it to a proto, but here we pass in a proto
    const b64 = protoToBase64(unlockedWithOldProto)

    return {
        id: 'test-id-123',
        status: 'UNLOCKED',
        initiallySubmittedAt: '2020-01-01',
        stateCode: 'MN',
        state: mockMNState(),
        revisions: [
            {
                node: {
                    id: 'revision3',
                    createdAt: new Date('2020-09-01'),
                    unlockInfo: {
                        updatedAt: new Date('2020-09-02'),
                        updatedBy: 'bob@dmas.mn.gov',
                        updatedReason: 'Test unlock reason',
                    },
                    submitInfo: null,
                    formDataProto: b64,
                },
            },
            {
                node: {
                    id: 'revision2',
                    createdAt: new Date('2020-07-01'),
                    unlockInfo: {
                        updatedAt: new Date('2020-08-01'),
                        updatedBy: 'bob@dmas.mn.gov',
                        updatedReason: 'Test unlock reason',
                    },
                    submitInfo: {
                        updatedAt: new Date('2020-07-15'),
                        updatedBy: 'bob@dmas.mn.gov',
                        updatedReason: 'Second Submit',
                    },
                    formDataProto: b64,
                },
            },
            {
                node: {
                    id: 'revision1',
                    createdAt: new Date('2020-01-01'),
                    unlockInfo: null,
                    submitInfo: {
                        updatedAt: new Date('2021-01-02'),
                        updatedBy: 'test@example.com',
                        updatedReason: 'Initial submit',
                    },
                    formDataProto: b64,
                },
            },
        ],
    }
}

export function mockUnlockedHealthPlanPackageWithDocuments(): HealthPlanPackage {
    // SETUP
    // for this test we want to have a package with a few different revisions
    // with different documents setup.
    const docs1: SubmissionDocument[] = [
        {
            s3URL: 's3://bucketname/one-one/one-one.png',
            name: 'one one',
            documentCategories: ['CONTRACT_RELATED'],
        },
        {
            s3URL: 's3://bucketname/one-two/one-two.png',
            name: 'one two',
            documentCategories: ['CONTRACT_RELATED'],
        },
        {
            s3URL: 's3://bucketname/one-three/one-three.png',
            name: 'one three',
            documentCategories: ['CONTRACT_RELATED'],
        },
    ]
    const docs2: SubmissionDocument[] = [
        {
            s3URL: 's3://bucketname/one-two/one-two.png',
            name: 'one two',
            documentCategories: ['CONTRACT_RELATED'],
        },
        {
            s3URL: 's3://bucketname/one-three/one-three.png',
            name: 'one three',
            documentCategories: ['CONTRACT_RELATED'],
        },
        {
            s3URL: 's3://bucketname/two-one/two-one.png',
            name: 'two one',
            documentCategories: ['CONTRACT_RELATED'],
        },
    ]
    const docs3: SubmissionDocument[] = [
        {
            s3URL: 's3://bucketname/one-two/one-two.png',
            name: 'one two',
            documentCategories: ['CONTRACT_RELATED'],
        },
        {
            s3URL: 's3://bucketname/two-one/two-one.png',
            name: 'two one',
            documentCategories: ['CONTRACT_RELATED'],
        },
        {
            s3URL: 's3://bucketname/three-one/three-one.png',
            name: 'three one',
            documentCategories: ['CONTRACT_RELATED'],
        },
    ]

    const baseFormData = basicLockedHealthPlanFormData()
    baseFormData.documents = docs1
    const b64one = domainToBase64(baseFormData)

    baseFormData.documents = docs2
    const b64two = domainToBase64(baseFormData)

    const unlockedFormData = basicHealthPlanFormData()
    unlockedFormData.documents = docs3
    const b64three = domainToBase64(unlockedFormData)

    // set our form data for each of these revisions.
    const testPackage = mockUnlockedHealthPlanPackage()
    testPackage.revisions[2].node.formDataProto = b64one
    testPackage.revisions[1].node.formDataProto = b64two
    testPackage.revisions[0].node.formDataProto = b64three

    return testPackage
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

type fetchHealthPlanPackageMockProps = {
    submission?: HealthPlanPackage
    id: string
}

const fetchHealthPlanPackageMockSuccess = ({
    submission = mockDraftHealthPlanPackage(),
    id,
}: fetchHealthPlanPackageMockProps): MockedResponse<FetchHealthPlanPackageQuery> => {
    // override the ID of the returned draft to match the queried id.
    const mergedDraftSubmission = Object.assign({}, submission, { id })
    return {
        request: {
            query: FetchHealthPlanPackageDocument,
            variables: { input: { pkgID: id } },
        },
        result: {
            data: {
                fetchHealthPlanPackage: {
                    pkg: mergedDraftSubmission,
                },
            },
        },
    }
}

const fetchHealthPlanPackageMockNotFound = ({
    id,
}: fetchHealthPlanPackageMockProps): MockedResponse<FetchHealthPlanPackageQuery> => {
    return {
        request: {
            query: FetchHealthPlanPackageDocument,
            variables: { input: { pkgID: id } },
        },
        result: {
            data: {
                fetchHealthPlanPackage: {
                    pkg: undefined,
                },
            },
        },
    }
}

const fetchHealthPlanPackageMockAuthFailure =
    (): MockedResponse<FetchHealthPlanPackageQuery> => {
        return {
            request: { query: FetchHealthPlanPackageDocument },
            error: new Error('You are not logged in'),
        }
    }

const fetchHealthPlanPackageMockNetworkFailure =
    (): MockedResponse<FetchHealthPlanPackageQuery> => {
        return {
            request: { query: FetchHealthPlanPackageDocument },
            error: new Error('A network error occurred'),
        }
    }

// type fetchStateSubmissionMockProps = {
//     stateSubmission?: StateSubmission | Partial<StateSubmission>
//     id: string
//     statusCode: 200 | 403 | 500
// }

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
            variables: { input: { pkgID: id } },
        },
        result: {
            data: {
                fetchHealthPlanPackage: {
                    pkg: mergedStateSubmission,
                },
            },
        },
    }
}

const mockSubmittedHealthPlanPackageWithRevision = ({
    currentSubmissionData,
    previousSubmissionData,
    initialSubmissionData,
}: {
    currentSubmissionData?: Partial<UnlockedHealthPlanFormDataType>
    previousSubmissionData?: Partial<UnlockedHealthPlanFormDataType>
    initialSubmissionData?: Partial<UnlockedHealthPlanFormDataType>
}): HealthPlanPackage => {
    const currentFiles: Partial<UnlockedHealthPlanFormDataType> = {
        contractDocuments: [
            {
                s3URL: 's3://bucket/1648242632157-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf',
                name: 'Amerigroup Texas, Inc.pdf',
                documentCategories: ['CONTRACT'],
            },
            {
                s3URL: 's3://bucket/1648490162641-lifeofgalileo.pdf/lifeofgalileo.pdf',
                name: 'lifeofgalileo.pdf',
                documentCategories: ['CONTRACT'],
            },
        ],
        rateInfos: [
            {
                rateDocuments: [
                    {
                        s3URL: 's3://bucket/1648242665634-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf',
                        name: 'Amerigroup Texas, Inc.pdf',
                        documentCategories: ['RATES_RELATED'],
                    },
                    {
                        s3URL: 's3://bucket/1648242711421-Amerigroup Texas Inc copy.pdf/Amerigroup Texas Inc copy.pdf',
                        name: 'Amerigroup Texas Inc copy.pdf',
                        documentCategories: ['RATES_RELATED'],
                    },
                ],
                actuaryContacts: [],
                packagesWithSharedRateCerts: [],
            },
        ],
        documents: [
            {
                s3URL: 's3://bucket/1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf/529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                name: '529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                documentCategories: ['CONTRACT_RELATED'],
            },
            {
                s3URL: 's3://bucket/1648242873229-covid-ifc-2-flu-rsv-codes 5-5-2021.pdf/covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
                name: 'covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
                documentCategories: ['RATES_RELATED'],
            },
        ],
    }
    const previousFiles: Partial<UnlockedHealthPlanFormDataType> = {
        contractDocuments: [
            {
                s3URL: 's3://bucketname/1648242632157-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf',
                name: 'Amerigroup Texas, Inc.pdf',
                documentCategories: ['CONTRACT'],
            },
            {
                s3URL: 's3://bucketname/1648242665634-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf',
                name: 'Amerigroup Texas, Inc.pdf',
                documentCategories: ['CONTRACT'],
            },
            {
                s3URL: 's3://bucketname/1648242711421-Amerigroup Texas Inc copy.pdf/Amerigroup Texas Inc copy.pdf',
                name: 'Amerigroup Texas Inc copy.pdf',
                documentCategories: ['CONTRACT'],
            },
        ],
        rateInfos: [
            {
                rateDocuments: [
                    {
                        s3URL: 's3://bucketname/1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf/529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                        name: '529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                        documentCategories: ['RATES'],
                    },
                    {
                        s3URL: 's3://bucketname/1648242873229-covid-ifc-2-flu-rsv-codes 5-5-2021.pdf/covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
                        name: 'covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
                        documentCategories: ['RATES'],
                    },
                    {
                        s3URL: 's3://bucketname/1648242632157-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf',
                        name: 'Amerigroup Texas, Inc.pdf',
                        documentCategories: ['RATES'],
                    },
                ],
                actuaryContacts: [],
                packagesWithSharedRateCerts: [],
            },
        ],
        documents: [
            {
                s3URL: 's3://bucketname/1648242665634-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf',
                name: 'Amerigroup Texas, Inc.pdf',
                documentCategories: ['CONTRACT_RELATED'],
            },
            {
                s3URL: 's3://bucketname/1648242711421-Amerigroup Texas Inc copy.pdf/Amerigroup Texas Inc copy.pdf',
                name: 'Amerigroup Texas Inc copy.pdf',
                documentCategories: ['CONTRACT_RELATED'],
            },
            {
                s3URL: 's3://bucketname/1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf/529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                name: '529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                documentCategories: ['RATES_RELATED'],
            },
        ],
    }

    const currentProto = domainToBase64({
        ...unlockedWithALittleBitOfEverything(),
        ...currentFiles,
        ...currentSubmissionData,
    })
    const previousProto = domainToBase64({
        ...unlockedWithALittleBitOfEverything(),
        ...previousFiles,
        ...previousSubmissionData,
    })
    const initialProto = domainToBase64({
        ...mockContactAndRatesDraft(),
        ...previousFiles,
        ...initialSubmissionData,
    })
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
                        updatedAt: '2022-03-25T21:13:20.419Z',
                        updatedBy: 'aang@example.com',
                        updatedReason: 'Initial submission',
                    },
                    createdAt: '2022-03-25T03:28:56.244Z',
                    formDataProto: initialProto,
                },
            },
        ],
    }
}

type updateHealthPlanFormDataMockSuccessProps = {
    pkg?: HealthPlanPackage
    updatedFormData: string
    id: string
}

const updateHealthPlanFormDataMockSuccess = ({
    pkg = mockUnlockedHealthPlanPackage(),
    updatedFormData,
    id,
}: updateHealthPlanFormDataMockSuccessProps): MockedResponse<UpdateHealthPlanFormDataMutation> => {
    return {
        request: {
            query: UpdateHealthPlanFormDataDocument,
            variables: {
                input: { pkgID: id, healthPlanFormData: updatedFormData },
            },
        },
        result: { data: { updateHealthPlanFormData: { pkg } } },
    }
}

const updateHealthPlanFormDataMockAuthFailure =
    (): MockedResponse<UpdateHealthPlanFormDataMutation> => {
        return {
            request: { query: UpdateHealthPlanFormDataDocument },
            error: new Error('You are not logged in'),
        }
    }

const updateHealthPlanFormDataMockNetworkFailure =
    (): MockedResponse<UpdateHealthPlanFormDataMutation> => {
        return {
            request: { query: UpdateHealthPlanFormDataDocument },
            error: new Error('A network error occurred'),
        }
    }

const createHealthPlanPackageMockSuccess =
    (): MockedResponse<CreateHealthPlanPackageMutation> => {
        const submissionData: Partial<UnlockedHealthPlanFormDataType> = {
            programIDs: ['d95394e5-44d1-45df-8151-1cc1ee66f100'],
            submissionType: 'CONTRACT_ONLY',
            riskBasedContract: true,
            submissionDescription: 'A submitted submission',
        }
        const pkg = mockDraftHealthPlanPackage()
        return {
            request: {
                query: CreateHealthPlanPackageDocument,
                variables: {
                    input: submissionData,
                },
            },
            result: { data: { createHealthPlanPackage: { pkg } } },
        }
    }

const createHealthPlanPackageMockAuthFailure =
    (): MockedResponse<CreateHealthPlanPackageMutation> => {
        return {
            request: { query: UpdateHealthPlanFormDataDocument },
            error: new Error('You are not logged in'),
        }
    }

const createHealthPlanPackageMockNetworkFailure =
    (): MockedResponse<CreateHealthPlanPackageMutation> => {
        return {
            request: { query: UpdateHealthPlanFormDataDocument },
            error: new Error('A network error occurred'),
        }
    }

type submitHealthPlanPackageMockSuccessProps = {
    stateSubmission?: HealthPlanPackage
    id: string
    submittedReason?: string
}

const submitHealthPlanPackageMockSuccess = ({
    stateSubmission,
    id,
    submittedReason,
}: submitHealthPlanPackageMockSuccessProps): MockedResponse<SubmitHealthPlanPackageMutation> => {
    const pkg = stateSubmission ?? mockDraftHealthPlanPackage()
    return {
        request: {
            query: SubmitHealthPlanPackageDocument,
            variables: { input: { pkgID: id, submittedReason } },
        },
        result: { data: { submitHealthPlanPackage: { pkg } } },
    }
}

const submitHealthPlanPackageMockError = ({
    id,
}: {
    id: string
}): MockedResponse<SubmitHealthPlanPackageMutation> => {
    return {
        request: {
            query: SubmitHealthPlanPackageDocument,
            variables: { input: { submissionID: id } },
        },
        result: {
            errors: [
                new GraphQLError(
                    'Incomplete submission cannot be submitted',
                    {}
                ),
            ],
        },
    }
}

type unlockHealthPlanPackageMockSuccessProps = {
    pkg?: HealthPlanPackage
    id: string
    reason: string
}

const unlockHealthPlanPackageMockSuccess = ({
    pkg = mockUnlockedHealthPlanPackage(),
    id,
    reason,
}: unlockHealthPlanPackageMockSuccessProps): MockedResponse<UnlockHealthPlanPackageMutation> => {
    return {
        request: {
            query: UnlockHealthPlanPackageDocument,
            variables: { input: { pkgID: id, unlockedReason: reason } },
        },
        result: { data: { unlockHealthPlanPackage: { pkg } } },
    }
}

const unlockHealthPlanPackageMockError = ({
    id,
    reason,
}: {
    id: string
    reason: string
}): MockedResponse<UnlockHealthPlanPackageMutation> => {
    return {
        request: {
            query: UnlockHealthPlanPackageDocument,
            variables: { input: { pkgID: id, unlockedReason: reason } },
        },
        result: {
            errors: [
                new GraphQLError(
                    'Incomplete submission cannot be submitted',
                    {}
                ),
            ],
        },
    }
}

const indexHealthPlanPackagesMockSuccess = (
    submissions: HealthPlanPackage[] = [
        { ...mockUnlockedHealthPlanPackage(), id: 'test-id-123' },
        { ...mockSubmittedHealthPlanPackage(), id: 'test-id-124' },
    ]
): MockedResponse<IndexHealthPlanPackagesQuery> => {
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
    fetchHealthPlanPackageMockSuccess,
    fetchHealthPlanPackageMockNotFound,
    fetchHealthPlanPackageMockNetworkFailure,
    fetchHealthPlanPackageMockAuthFailure,
    fetchStateHealthPlanPackageMockSuccess,
    updateHealthPlanFormDataMockAuthFailure,
    updateHealthPlanFormDataMockNetworkFailure,
    updateHealthPlanFormDataMockSuccess,
    submitHealthPlanPackageMockSuccess,
    submitHealthPlanPackageMockError,
    indexHealthPlanPackagesMockSuccess,
    unlockHealthPlanPackageMockSuccess,
    unlockHealthPlanPackageMockError,
    mockSubmittedHealthPlanPackageWithRevision,
    createHealthPlanPackageMockSuccess,
    createHealthPlanPackageMockAuthFailure,
    createHealthPlanPackageMockNetworkFailure,
}
