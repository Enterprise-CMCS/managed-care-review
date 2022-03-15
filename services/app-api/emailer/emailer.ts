import { Lambda } from 'aws-sdk'
import {
    getSESEmailParams,
    newPackageCMSEmail,
    newPackageStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail
} from './'
import {
    StateSubmissionType,
    CognitoUserType,
} from '../../app-web/src/common-code/domain-models'
import { UnlockEmailData } from './templates'

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
        unlockEmailData: UnlockEmailData
    ) => Promise<void | Error>
    sendUnlockPackageStateEmail: (
        submission: StateSubmissionType,
        unlockEmailData: UnlockEmailData
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
        sendUnlockPackageCMSEmail: async function (unlockEmailData){
            const emailData = unlockPackageCMSEmail(unlockEmailData, config)
            return await this.sendEmail(emailData)
        },
        sendUnlockPackageStateEmail: async function (submission, unlockEmailData){
            const emailData = unlockPackageStateEmail(
                submission,
                unlockEmailData, 
                config)
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
            unlockEmailData: UnlockEmailData
        ) => {
            const emailData = unlockPackageCMSEmail(unlockEmailData, config)
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
            unlockEmailData: UnlockEmailData
        ) => {
            const emailData = unlockPackageStateEmail(submission,unlockEmailData, config)
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
