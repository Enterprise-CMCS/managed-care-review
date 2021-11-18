import { Lambda } from 'aws-sdk'
import { getSESEmailParams } from './'

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

function isEmailData(data: EmailData): data is EmailData {
    return Boolean(
        data.bodyText && data.sourceEmail && data.subject && data.toAddresses
    )
}

type Emailer = {
    sendEmail: (emailData: EmailData) => Promise<void | Error>
}

function newSESEmailer(): Emailer {
    const lambda = new Lambda()

    return {
        sendEmail: async (emailData: EmailData): Promise<void | Error> => {
            const emailRequestParams = getSESEmailParams(emailData)
            const lambdaParams = {
                FunctionName: `app-api-${process.env.stage}-email_submit`,
                Payload: JSON.stringify({ body: emailRequestParams }),
            }

            try {
                await lambda.invoke(lambdaParams).promise()
                console.log('Email send succeeded')
                return
            } catch (err) {
                return new Error('Email send failed. ' + err)
            }
        },
    }
}

function newLocalEmailer(): Emailer {
    return {
        sendEmail: async (emailData: EmailData): Promise<void | Error> => {
            console.log('Mock email locally')
            console.log('Email content' + emailData)
        },
    }
}

const getEmailer = (): Emailer => {
    if (process.env.stage == 'LOCAL') {
        return newLocalEmailer()
    } else {
        return newSESEmailer()
    }
}

export { getEmailer, isEmailData }
export type { Emailer, EmailData }
