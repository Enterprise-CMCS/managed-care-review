import {
    EmailConfiguration,
    EmailData,
    Emailer,
    newPackageCMSEmail,
    newPackageStateEmail,
    UpdatedEmailData,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmittedStateEmail,
    resubmittedCMSEmail,
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

const testStateAnalystsEmails = () => [
    '"MN State Analyst 1" <MNStateAnalyst1@example.com>',
    '"MN State Analyst 2" <MNStateAnalyst2@example.com>',
]

const submissionName = 'MN-PMAP-0001'

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
            try {
                const emailData = await newPackageCMSEmail(
                    submission,
                    submissionName,
                    config,
                    stateAnalystsEmails
                )
                return this.sendEmail(emailData)
            } catch (err) {
                console.error(err)
                return new Error(err)
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
            return this.sendEmail(emailData)
        },
        sendUnlockPackageCMSEmail: function async(
            submission,
            updatedEmailData,
            submissionName,
            stateAnalystsEmails
        ): Promise<void | Error> {
            const emailData = unlockPackageCMSEmail(
                submission,
                updatedEmailData,
                config,
                submissionName,
                stateAnalystsEmails
            )
            return this.sendEmail(emailData)
        },
        sendUnlockPackageStateEmail: function async(
            submission,
            updatedEmailData
        ): Promise<void | Error> {
            const emailData = unlockPackageStateEmail(
                submission,
                updatedEmailData,
                config,
                submissionName
            )
            return this.sendEmail(emailData)
        },
        sendResubmittedStateEmail: function async(
            submission: LockedHealthPlanFormDataType,
            updatedEmailData: UpdatedEmailData,
            user: UserType
        ): Promise<void | Error> {
            const emailData = resubmittedStateEmail(
                submission,
                user,
                updatedEmailData,
                config
            )
            return this.sendEmail(emailData)
        },
        sendResubmittedCMSEmail: function async(
            submission,
            updatedEmailData,
            stateAnalystsEmails
        ): Promise<void | Error> {
            const emailData = resubmittedCMSEmail(
                submission,
                updatedEmailData,
                config,
                stateAnalystsEmails
            )
            return this.sendEmail(emailData)
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
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
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
        rateDateStart: new Date(),
        rateDateEnd: new Date(),
        rateDateCertified: new Date(),
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
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
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
        rateDateStart: new Date(),
        rateDateEnd: new Date(),
        rateDateCertified: new Date(),
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
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
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
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
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
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
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
        rateDateStart: new Date(),
        rateDateEnd: new Date(),
        rateDateCertified: new Date(),
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
    mockContractAmendmentFormData,
    mockContractOnlyFormData,
    mockContractAndRatesFormData,
    mockUnlockedContractAndRatesFormData,
    mockUnlockedContractOnlyFormData,
    mockUser,
    testEmailer,
}
