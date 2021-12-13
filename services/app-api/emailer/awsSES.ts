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

async function sendSESEmail(
    params: SES.SendEmailRequest
): Promise<SES.SendEmailResponse | AWSError> {
    console.log('SENDING SES EMAIL', params)
    try {
        const response = await ses.sendEmail(params).promise()
        return response
    } catch (err) {
        return err
    }
}

export { getSESEmailParams, sendSESEmail }
