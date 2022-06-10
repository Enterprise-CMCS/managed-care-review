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
    cmsReviewSharedEmails: ['cmsreview1@example.com', 'cmsreview2@example.com'],
    cmsMcogEmailAddress: 'mcog@example.com',
    cmsRateEmailAddress: 'rates@example.com',
    cmsDirectReviewTeamEmailAddress: 'mc-review@example.com',
    ratesReviewSharedEmails: ['ratesreview@example.com'],
}

const submissionName = 'MN-PMAP-0001'

const testEmailer = (customConfig?: EmailConfiguration): Emailer => {
    const config = customConfig || testEmailConfig
    return {
        sendEmail: jest.fn(
            async (emailData: EmailData): Promise<void | Error> => {
                console.log('Email content' + JSON.stringify(emailData))
            }
        ),
        sendCMSNewPackage: function async(
            submission: LockedHealthPlanFormDataType,
            submissionName: string
        ): Promise<void | Error> {
            const emailData = newPackageCMSEmail(
                submission,
                submissionName,
                config
            )
            return this.sendEmail(emailData)
        },
        sendStateNewPackage: function async(
            submission: LockedHealthPlanFormDataType,
            submissionName: string,
            user: UserType
        ): Promise<void | Error> {
            const emailData = newPackageStateEmail(
                submission,
                submissionName,
                user,
                config
            )
            return this.sendEmail(emailData)
        },
        sendUnlockPackageCMSEmail: function async(
            submission: UnlockedHealthPlanFormDataType,
            updatedEmailData: UpdatedEmailData,
            submissionName: string
        ): Promise<void | Error> {
            const emailData = unlockPackageCMSEmail(
                submission,
                updatedEmailData,
                config,
                submissionName
            )
            return this.sendEmail(emailData)
        },
        sendUnlockPackageStateEmail: function async(
            submission: UnlockedHealthPlanFormDataType,
            updatedEmailData: UpdatedEmailData
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
            submission: LockedHealthPlanFormDataType,
            updatedEmailData: UpdatedEmailData
        ): Promise<void | Error> {
            const emailData = resubmittedCMSEmail(
                submission,
                updatedEmailData,
                config
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
    mockContractAmendmentFormData,
    mockContractOnlyFormData,
    mockContractAndRatesFormData,
    mockUnlockedContractAndRatesFormData,
    mockUnlockedContractOnlyFormData,
    mockUser,
    testEmailer,
}
