import { SES, AWSError, Request } from 'aws-sdk'
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

function sendSESEmail(
    params: SES.SendEmailRequest
): Request<SES.SendEmailResponse, AWSError> {
    console.log('SENDING SES EMAIL')
    return ses.sendEmail(params, function (err, data) {
        if (err) {
            return new Error('SES error: ' + err)
        } else {
            return data
        }
    })
}

export { getSESEmailParams, sendSESEmail }
