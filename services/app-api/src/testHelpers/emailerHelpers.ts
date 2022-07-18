import {
    EmailConfiguration,
    EmailData,
    Emailer,
    newPackageCMSEmail,
    newPackageStateEmail,
    UpdatedEmailData,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmitPackageStateEmail,
    resubmitPackageCMSEmail,
} from '../emailer'
import {
    LockedHealthPlanFormDataType,
    UnlockedHealthPlanFormDataType,
} from '../../../app-web/src/common-code/healthPlanFormDataType'
import { UserType, StateUserType } from '../domain-models'

const testEmailConfig: EmailConfiguration = {
    stage: 'LOCAL',
    baseUrl: 'http://localhost',
    emailSource: 'emailSource@example.com',
    cmsReviewSharedEmails: [
        'cmsreview1@example.com',
        'cmsreview2@example.com',
        'rates@example.com',
    ],
    cmsReviewHelpEmailAddress: 'mcog@example.com',
    cmsRateHelpEmailAddress: 'rates@example.com',
    cmsDevTeamHelpEmailAddress: 'mc-review@example.com',
    ratesReviewSharedEmails: ['ratesreview@example.com'],
}

const testDuplicateEmailConfig: EmailConfiguration = {
    stage: 'LOCAL',
    baseUrl: 'http://localhost',
    emailSource: 'emailSource@example.com',
    cmsReviewSharedEmails: [
        'duplicate@example.com',
        'duplicate@example.com',
        'duplicate@example.com',
    ],
    cmsReviewHelpEmailAddress: 'duplicate@example.com',
    cmsRateHelpEmailAddress: 'duplicate@example.com',
    cmsDevTeamHelpEmailAddress: 'duplicate@example.com',
    ratesReviewSharedEmails: ['duplicate@example.com'],
}

const testStateAnalystsEmails: string[] = [
    '"State Analyst 1" <StateAnalyst1@example.com>',
    '"State Analyst 2" <StateAnalyst2@example.com>',
]

const testDuplicateStateAnalystsEmails: string[] = [
    'duplicate@example.com',
    'duplicate@example.com',
]

function testEmailer(customConfig?: EmailConfiguration): Emailer {
    const config = customConfig || testEmailConfig
    return {
        sendEmail: jest.fn(
            async (emailData: EmailData): Promise<void | Error> => {
                console.log('Email content' + JSON.stringify(emailData))
            }
        ),
        sendCMSNewPackage: async function (
            submission,
            submissionName,
            stateAnalystsEmails
        ): Promise<void | Error> {
            const emailData = await newPackageCMSEmail(
                submission,
                submissionName,
                config,
                stateAnalystsEmails
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendStateNewPackage: async function (
            submission,
            submissionName,
            user
        ): Promise<void | Error> {
            const emailData = await newPackageStateEmail(
                submission,
                submissionName,
                user,
                config
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return await this.sendEmail(emailData)
            }
        },
        sendUnlockPackageCMSEmail: async function (
            submission,
            updatedEmailData,
            stateAnalystsEmails
        ): Promise<void | Error> {
            const emailData = await unlockPackageCMSEmail(
                submission,
                updatedEmailData,
                config,
                stateAnalystsEmails
            )

            if (emailData instanceof Error) {
                return emailData
            } else {
                return this.sendEmail(emailData)
            }
        },
        sendUnlockPackageStateEmail: async function (
            submission,
            updatedEmailData
        ): Promise<void | Error> {
            const emailData = await unlockPackageStateEmail(
                submission,
                updatedEmailData,
                config
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return this.sendEmail(emailData)
            }
        },
        sendResubmittedStateEmail: async function (
            submission: LockedHealthPlanFormDataType,
            updatedEmailData: UpdatedEmailData,
            user: UserType
        ): Promise<void | Error> {
            const emailData = await resubmitPackageStateEmail(
                submission,
                user,
                updatedEmailData,
                config
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return this.sendEmail(emailData)
            }
        },
        sendResubmittedCMSEmail: async function (
            submission,
            updatedEmailData,
            stateAnalystsEmails
        ): Promise<void | Error> {
            const emailData = await resubmitPackageCMSEmail(
                submission,
                updatedEmailData,
                config,
                stateAnalystsEmails
            )
            if (emailData instanceof Error) {
                return emailData
            } else {
                return this.sendEmail(emailData)
            }
        },
    }
}

const mockUser = (): StateUserType => {
    return {
        role: 'STATE_USER',
        email: 'test+state+user@example.com',
        name: 'Test State User',
        state_code: 'MN',
    }
}

const mockContractAndRatesFormData = (
    submissionPartial?: Partial<LockedHealthPlanFormDataType>
): LockedHealthPlanFormDataType => {
    return {
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'SUBMITTED',
        stateNumber: 3,
        id: 'test-abc-125',
        stateCode: 'MN',
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A submitted submission',
        submittedAt: new Date(),
        documents: [
            {
                s3URL: 'bar',
                name: 'foo',
                documentCategories: ['RATES_RELATED' as const],
            },
        ],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [
            {
                s3URL: 'bar',
                name: 'foo',
                documentCategories: ['CONTRACT' as const],
            },
        ],
        contractDateStart: '2021-01-01',
        contractDateEnd: '2022-01-01',
        managedCareEntities: ['ENROLLMENT_PROCESS'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: 'NEW',
        rateDocuments: [
            {
                s3URL: 'bar',
                name: 'foo',
                documentCategories: ['RATES' as const],
            },
        ],
        rateDateStart: '2021-01-01',
        rateDateEnd: '2025-01-01',
        rateDateCertified: '2021-12-31',
        rateAmendmentInfo: null,
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test+state+contact@example.com',
            },
        ],
        actuaryContacts: [],
        ...submissionPartial,
    }
}

const mockUnlockedContractAndRatesFormData = (
    submissionPartial?: Partial<UnlockedHealthPlanFormDataType>
): UnlockedHealthPlanFormDataType => {
    return {
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'DRAFT',
        stateNumber: 3,
        id: 'test-abc-125',
        stateCode: 'MN',
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A submitted submission',
        documents: [
            {
                s3URL: 'bar',
                name: 'foo',
                documentCategories: ['RATES_RELATED' as const],
            },
        ],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [
            {
                s3URL: 'bar',
                name: 'foo',
                documentCategories: ['CONTRACT' as const],
            },
        ],
        contractDateStart: '2021-01-01',
        contractDateEnd: '2022-01-01',
        managedCareEntities: ['ENROLLMENT_PROCESS'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: 'NEW',
        rateDocuments: [
            {
                s3URL: 'bar',
                name: 'foo',
                documentCategories: ['RATES' as const],
            },
        ],
        rateDateStart: '2021-01-01',
        rateDateEnd: '2025-01-01',
        rateDateCertified: '2021-12-31',
        rateAmendmentInfo: undefined,
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test+state+contact@example.com',
            },
        ],
        actuaryContacts: [],
        ...submissionPartial,
    }
}

const mockUnlockedContractOnlyFormData = (
    submissionPartial?: Partial<UnlockedHealthPlanFormDataType>
): UnlockedHealthPlanFormDataType => {
    return {
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'DRAFT',
        stateNumber: 3,
        id: 'test-abc-125',
        stateCode: 'MN',
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A submitted submission',
        documents: [
            {
                s3URL: 'bar',
                name: 'foo',
                documentCategories: ['CONTRACT_RELATED' as const],
            },
        ],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [
            {
                s3URL: 'bar',
                name: 'foo',
                documentCategories: ['CONTRACT' as const],
            },
        ],
        contractDateStart: '2021-01-01',
        contractDateEnd: '2022-01-01',
        managedCareEntities: ['ENROLLMENT_PROCESS'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateDocuments: [],
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test+state+contact@example.com',
            },
        ],
        actuaryContacts: [],
        ...submissionPartial,
    }
}

const mockContractOnlyFormData = (
    submissionPartial?: Partial<LockedHealthPlanFormDataType>
): LockedHealthPlanFormDataType => {
    return {
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'SUBMITTED',
        stateNumber: 3,
        id: 'test-abc-125',
        stateCode: 'MN',
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A submitted submission',
        submittedAt: new Date(),
        documents: [
            {
                s3URL: 'bar',
                name: 'foo',
                documentCategories: ['RATES_RELATED' as const],
            },
        ],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [
            {
                s3URL: 'bar',
                name: 'foo',
                documentCategories: ['CONTRACT' as const],
            },
        ],
        contractDateStart: '2021-01-01',
        contractDateEnd: '2022-01-01',
        managedCareEntities: ['ENROLLMENT_PROCESS'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateDocuments: [],
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test+state+contact@example.com',
            },
        ],
        actuaryContacts: [],
        ...submissionPartial,
    }
}

const mockContractAmendmentFormData = (
    submissionPartial?: Partial<LockedHealthPlanFormDataType>
): LockedHealthPlanFormDataType => {
    return {
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'SUBMITTED',
        stateNumber: 3,
        id: 'test-abc-125',
        stateCode: 'MN',
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A submitted submission',
        submittedAt: new Date(),
        documents: [
            {
                s3URL: 'bar',
                name: 'foo',
                documentCategories: ['RATES_RELATED' as const],
            },
        ],
        contractType: 'AMENDMENT',
        contractExecutionStatus: 'UNEXECUTED',
        contractDocuments: [
            {
                s3URL: 'bar',
                name: 'foo',
                documentCategories: ['CONTRACT' as const],
            },
        ],
        contractDateStart: '2021-01-01',
        contractDateEnd: '2022-01-01',
        managedCareEntities: ['ENROLLMENT_PROCESS'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: 'NEW',
        rateDocuments: [
            {
                s3URL: 'bar',
                name: 'foo',
                documentCategories: ['RATES' as const],
            },
        ],
        rateDateStart: '2021-01-01',
        rateDateEnd: '2025-01-01',
        rateDateCertified: '2021-12-31',
        rateAmendmentInfo: null,
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test+state+contact@example.com',
            },
        ],
        actuaryContacts: [],
        ...submissionPartial,
    }
}

export {
    testEmailConfig,
    testStateAnalystsEmails,
    testDuplicateEmailConfig,
    testDuplicateStateAnalystsEmails,
    mockContractAmendmentFormData,
    mockContractOnlyFormData,
    mockContractAndRatesFormData,
    mockUnlockedContractAndRatesFormData,
    mockUnlockedContractOnlyFormData,
    mockUser,
    testEmailer,
}
