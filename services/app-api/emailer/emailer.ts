import { Lambda } from 'aws-sdk'
import { getSESEmailParams, newEmailTemplate } from './'
import type { EmailTemplateParams } from './'

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
    generateEmailTemplate: (
        params: Omit<EmailTemplateParams, 'config'> // omit config because that data is passed to Emailer on initialization
    ) => EmailData
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
        generateEmailTemplate: (
            params: Omit<EmailTemplateParams, 'config'>
        ): EmailData => {
            const template = newEmailTemplate({ ...params, config })
            if (template instanceof Error)
                throw Error(`generateEmailTemplate failed: ${template}`)
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
        generateEmailTemplate: (
            params: Omit<EmailTemplateParams, 'config'>
        ): EmailData => {
            const template = newEmailTemplate({ ...params, config })
            if (template instanceof Error) throw Error('Invalid Email template')
            return template
        },
    }
}

export { newLocalEmailer, newSESEmailer }
export type { Emailer, EmailConfiguration, EmailData }
