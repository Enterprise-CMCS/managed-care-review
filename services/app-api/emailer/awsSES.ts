import { SES, AWSError } from 'aws-sdk'
import { EmailData } from './'

const ses = new SES({ region: 'us-east-1' })

function getSESEmailParams(email: EmailData): SES.SendEmailRequest {
    const {
        bccAddresses,
        ccAddresses,
        toAddresses,
        bodyText,
        bodyHTML,
        bodyCharset,
        subject,
        subjectCharset,
        sourceEmail,
        replyToAddresses,
    } = email

    const emailParams: SES.SendEmailRequest = {
        Destination: {
            BccAddresses: bccAddresses || [],
            CcAddresses: ccAddresses || [],
            ToAddresses: toAddresses,
        },
        Message: {
            Body: {
                Text: {
                    Data: bodyText,
                    Charset: bodyCharset || 'UTF-8',
                },
                Html: {
                    Data: bodyHTML || bodyText,
                    Charset: bodyCharset || 'UTF-8',
                },
            },
            Subject: {
                Data: subject,
                Charset: subjectCharset || 'UTF-8',
            },
        },
        Source: sourceEmail,
        ReplyToAddresses: replyToAddresses,
    }

    return emailParams
}

class AWSResponseError extends Error {
    awsErr: AWSError

    constructor(awsErr: AWSError) {
        super(awsErr.message)
        this.awsErr = awsErr

        // Set the prototype explicitly.
        // this makes `instanceof` work correctly
        Object.setPrototypeOf(this, AWSResponseError.prototype)
    }
}

async function sendSESEmail(
    params: SES.SendEmailRequest
): Promise<SES.SendEmailResponse | AWSResponseError> {
    console.log('SENDING SES EMAIL', params)
    try {
        const response = await ses.sendEmail(params).promise()
        return response
    } catch (err) {
        return new AWSResponseError(err)
    }
}

export { getSESEmailParams, sendSESEmail, AWSResponseError }
