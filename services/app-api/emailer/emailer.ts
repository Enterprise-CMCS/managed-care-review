import { Lambda } from 'aws-sdk'
import {
    getSESEmailParams,
    newPackageCMSEmail,
    newPackageStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmittedStateEmail,
    resubmittedCMSEmail,
    UpdatedEmailData
} from './'
import {
    StateSubmissionType,
    CognitoUserType,
} from '../../app-web/src/common-code/domain-models'

type EmailConfiguration = {
    stage: string
    baseUrl: string
    emailSource: string // an email address for the generic application-wide sender
    cmsReviewSharedEmails: string[] // list of shared emails that all new managed care packages must be sent to
}
type EmailData = {
    bodyText: string
    sourceEmail: string
    subject: string
    toAddresses: string[]
    bccAddresses?: string[]
    ccAddresses?: string[]
    replyToAddresses?: string[]
    subjectCharset?: string
    bodyCharset?: string
    bodyHTML?: string
}

type Emailer = {
    sendEmail: (emailData: EmailData) => Promise<void | Error>
    sendCMSNewPackage: (
        submission: StateSubmissionType
    ) => Promise<void | Error>
    sendStateNewPackage: (
        submission: StateSubmissionType,
        user: CognitoUserType
    ) => Promise<void | Error>
    sendUnlockPackageCMSEmail: (
        updatedEmailData: UpdatedEmailData
    ) => Promise<void | Error>
    sendUnlockPackageStateEmail: (
        submission: StateSubmissionType,
        updatedEmailData: UpdatedEmailData
    ) => Promise<void | Error>
    sendResubmittedStateEmail: (
        submission: StateSubmissionType,
        updatedEmailData: UpdatedEmailData
    ) => Promise<void | Error>
    sendResubmittedCMSEmail: (
        submission: StateSubmissionType,
        updatedEmailData: UpdatedEmailData
    ) => Promise<void | Error>
}

function newSESEmailer(config: EmailConfiguration): Emailer {
    const lambda = new Lambda()
    return {
        sendEmail: async (emailData: EmailData): Promise<void | Error> => {
            const emailRequestParams = getSESEmailParams(emailData)
            const lambdaParams = {
                FunctionName: `app-api-${config.stage}-email_submit`,
                Payload: JSON.stringify({ body: emailRequestParams }),
            }

            try {
                const sesResult = await lambda.invoke(lambdaParams).promise()
                return
            } catch (err) {
                return new Error('SES email send failed. ' + err)
            }
        },
        sendCMSNewPackage: async function (submission: StateSubmissionType) {
            const emailData = newPackageCMSEmail(submission, config)
            return await this.sendEmail(emailData)
        },
        sendStateNewPackage: async function (
            submission: StateSubmissionType,
            user: CognitoUserType
        ) {
            const emailData = newPackageStateEmail(
                submission,
                user,
                config
            )
            return await this.sendEmail(emailData)
        },
        sendUnlockPackageCMSEmail: async function (updatedEmailData){
            const emailData = unlockPackageCMSEmail(updatedEmailData, config)
            return await this.sendEmail(emailData)
        },
        sendUnlockPackageStateEmail: async function (submission, updatedEmailData){
            const emailData = unlockPackageStateEmail(
                submission,
                updatedEmailData,
                config)
            return await this.sendEmail(emailData)
        },
        sendResubmittedStateEmail: async function (submission,updatedEmailData){
            const emailData = resubmittedStateEmail(submission, updatedEmailData, config)
            return await this.sendEmail(emailData)
        },
        sendResubmittedCMSEmail: async function (submission, updatedEmailData){
            const emailData = resubmittedCMSEmail(submission, updatedEmailData, config)
            return await this.sendEmail(emailData)
        }
    }
}

function newLocalEmailer(config: EmailConfiguration): Emailer {
    return {
        sendEmail: async (emailData: EmailData): Promise<void | Error> => {
            const emailRequestParams = getSESEmailParams(emailData)
            console.log(`
            EMAIL SENT
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
            ${JSON.stringify(emailRequestParams)}
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
        `)
        },
        sendCMSNewPackage: async (submission: StateSubmissionType) => {
            const emailData = newPackageCMSEmail(submission, config)
            const emailRequestParams = getSESEmailParams(emailData)
            console.log(`
            EMAIL SENT
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
            ${JSON.stringify(emailRequestParams)}
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
        `)
        },
        sendStateNewPackage: async (
            submission: StateSubmissionType,
            user: CognitoUserType
        ) => {
            const emailData = newPackageStateEmail(
                submission,
                user,
                config
            )
            const emailRequestParams = getSESEmailParams(emailData)
            console.log(`
            EMAIL SENT
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
            ${JSON.stringify(emailRequestParams)}
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
        `)
        },
        sendUnlockPackageCMSEmail: async (
            updatedEmailData: UpdatedEmailData
        ) => {
            const emailData = unlockPackageCMSEmail(updatedEmailData, config)
            const emailRequestParams = getSESEmailParams(emailData)
            console.log(`
            EMAIL SENT
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
            ${JSON.stringify(emailRequestParams)}
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
        `)
        },
        sendUnlockPackageStateEmail: async (
            submission: StateSubmissionType,
            updatedEmailData: UpdatedEmailData
        ) => {
            const emailData = unlockPackageStateEmail(submission, updatedEmailData, config)
            const emailRequestParams = getSESEmailParams(emailData)
            console.log(`
            EMAIL SENT
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
            ${JSON.stringify(emailRequestParams)}
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
        `)
        },
        sendResubmittedStateEmail: async (
            submission: StateSubmissionType,
            updatedEmailData: UpdatedEmailData
        ) => {
            const emailData = resubmittedStateEmail(submission, updatedEmailData, config)
            const emailRequestParams = getSESEmailParams(emailData)
            console.log(`
            EMAIL SENT
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
            ${JSON.stringify(emailRequestParams)}
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
        `)
        },
        sendResubmittedCMSEmail: async (
            submission: StateSubmissionType,
            updatedEmailData: UpdatedEmailData
        ) => {
            const emailData = resubmittedCMSEmail(submission, updatedEmailData, config)
            const emailRequestParams = getSESEmailParams(emailData)
            console.log(`
            EMAIL SENT
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
            ${JSON.stringify(emailRequestParams)}
            ${'(¯`·.¸¸.·´¯`·.¸¸.·´¯·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´¯`·.¸¸.·´)'}
        `)
        },
    }
}

export { newLocalEmailer, newSESEmailer }
export type { Emailer, EmailConfiguration, EmailData }
