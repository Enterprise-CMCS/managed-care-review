import { Lambda } from 'aws-sdk'
import {
    getSESEmailParams,
    newPackageCMSEmailTemplate,
    newPackageStateEmailTemplate,
} from './'
import {
    StateSubmissionType,
    CognitoUserType,
} from '../../app-web/src/common-code/domain-models'

type EmailConfiguration = {
    stage: string
    emailSource: string
    baseUrl: string
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
}

function newSESEmailer(config: EmailConfiguration): Emailer {
    console.log('using SES emailer')
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
                console.log('SES email invoked!', sesResult)
                return
            } catch (err) {
                return new Error('SES email send failed. ' + err)
            }
        },
        sendCMSNewPackage: async function (submission: StateSubmissionType) {
            const emailData = newPackageCMSEmailTemplate(submission, config)
            return await this.sendEmail(emailData)
        },
        sendStateNewPackage: async function (
            submission: StateSubmissionType,
            user: CognitoUserType
        ) {
            const emailData = newPackageStateEmailTemplate(
                submission,
                user,
                config
            )
            return await this.sendEmail(emailData)
        },
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
            const emailData = newPackageCMSEmailTemplate(submission, config)
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
            const emailData = newPackageStateEmailTemplate(
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
    }
}

export { newLocalEmailer, newSESEmailer }
export type { Emailer, EmailConfiguration, EmailData }
