import { Lambda } from 'aws-sdk'
import { StateSubmissionType } from '../../app-web/src/common-code/domain-models'
import {
    getSESEmailParams,
    newSubmissionCMSEmailTemplate,
    newEmailTemplate,
} from './'
import type { EmailTemplate } from './'

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
    generateCMSEmail: (submission: StateSubmissionType) => EmailData
    generateEmailTemplate: ({
        template,
        submission,
        config,
    }: {
        template: EmailTemplate
        submission: StateSubmissionType
        config: EmailConfiguration
    }) => EmailData
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
        generateCMSEmail: (submission: StateSubmissionType): EmailData => {
            return newSubmissionCMSEmailTemplate(submission, config)
        },
        generateEmailTemplate: (options: {
            template: EmailTemplate
            submission: StateSubmissionType
            config: EmailConfiguration
        }): EmailData => {
            const template = newEmailTemplate(options)
            if (template instanceof Error) throw Error('Invalid Email Template')
            return template
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
        generateCMSEmail: (submission: StateSubmissionType): EmailData => {
            return newSubmissionCMSEmailTemplate(submission, config)
        },
        generateEmailTemplate: (options: {
            template: EmailTemplate
            submission: StateSubmissionType
            config: EmailConfiguration
        }): EmailData => {
            const template = newEmailTemplate(options)
            if (template instanceof Error) throw Error('Invalid Email template')
            return template
        },
    }
}

export { newLocalEmailer, newSESEmailer }
export type { Emailer, EmailConfiguration, EmailData }
