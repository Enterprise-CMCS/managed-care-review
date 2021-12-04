import { Lambda } from 'aws-sdk'
import { StateSubmissionType } from '../../app-web/src/common-code/domain-models'
import { getSESEmailParams, newSubmissionCMSEmailTemplate } from './'

type EmailConfiguration = {
    stage: string
    baseUrl: string
    emailSource: string // an email address for the generic application-wide sender
    cmsReviewSharedEmails: string // comma separated list of shared emails that all new managed care packages must be sent to
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
    }
}

export { newLocalEmailer, newSESEmailer }
export type { Emailer, EmailConfiguration, EmailData }
