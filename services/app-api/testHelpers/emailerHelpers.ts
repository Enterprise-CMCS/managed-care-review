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
    StateSubmissionType,
    CognitoUserType,
    CognitoStateUserType
} from '../../app-web/src/common-code/domain-models'

const testEmailConfig: EmailConfiguration = {
    stage: 'LOCAL',
    baseUrl: 'http://localhost',
    emailSource: 'emailSource@example.com',
    cmsReviewSharedEmails: ['cmsreview1@example.com', 'cmsreview2@example.com']
}

const testEmailer = (customConfig?: EmailConfiguration): Emailer => {
    const config = customConfig || testEmailConfig
    return {
        sendEmail: jest.fn(
            async (emailData: EmailData): Promise<void | Error> => {
                console.log('Email content' + JSON.stringify(emailData))
            }
        ),
        sendCMSNewPackage: function async(
            submission: StateSubmissionType,
            submissionName: string,
        ): Promise<void | Error> {
            const emailData = newPackageCMSEmail(submission, submissionName, config)
            return this.sendEmail(emailData)
        },
        sendStateNewPackage: function async(
            submission: StateSubmissionType,
            submissionName: string,
            user: CognitoUserType
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
            updatedEmailData: UpdatedEmailData
        ): Promise<void | Error> {
            const emailData = unlockPackageCMSEmail(
                updatedEmailData,
                config
            )
            return this.sendEmail(emailData)
        },
        sendUnlockPackageStateEmail: function async(
            submission: StateSubmissionType,
            updatedEmailData: UpdatedEmailData
        ): Promise<void | Error> {
            const emailData = unlockPackageStateEmail(
                submission,
                updatedEmailData,
                config
            )
            return this.sendEmail(emailData)
        },
        sendResubmittedStateEmail: function async(
            submission: StateSubmissionType,
            updatedEmailData: UpdatedEmailData,
            user: CognitoUserType
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
            submission: StateSubmissionType,
            updatedEmailData: UpdatedEmailData
        ): Promise<void | Error> {
            const emailData = resubmittedCMSEmail(
                submission,
                updatedEmailData,
                config
            )
            return this.sendEmail(emailData)
        }
    }
}
    
const mockUser = (): CognitoStateUserType  => {
    return {
        role: 'STATE_USER',
        email: 'test+state+user@example.com',
        name: 'Test State User',
        state_code: 'MN',
        }
}
   
const mockContractAndRatesSubmission = (
   submissionPartial?: Partial<StateSubmissionType>
): StateSubmissionType => {
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
       ...submissionPartial
   }
}
   
const mockContractOnlySubmission = (
   submissionPartial?: Partial<StateSubmissionType>
): StateSubmissionType => {
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

const mockContractAmendmentSubmission = (
    submissionPartial?: Partial<StateSubmissionType>
): StateSubmissionType => {
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

export { testEmailConfig, mockContractAmendmentSubmission, mockContractOnlySubmission, mockContractAndRatesSubmission, mockUser, testEmailer }
