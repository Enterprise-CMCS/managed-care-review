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
    try {
        const response = await ses.sendEmail(params).promise()
        return response
    } catch (err) {
        return new AWSResponseError(err)
    }
}

export { getSESEmailParams, sendSESEmail, AWSResponseError }

/*
// This is an example SES SendEmail params for a call to ses.sendEmail that works with our config.
var params: SES.SendEmailRequest = {
        Destination: {
            BccAddresses: [],
            CcAddresses: [],
            ToAddresses: ['macrae@truss.works'],
        },
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: 'HELLO This message body contains HTML formatting. It can, for example, contain links like this one: <a class="ulink" href="http://docs.aws.amazon.com/ses/latest/DeveloperGuide" target="_blank">Amazon SES Developer Guide</a>.',
                },
                Text: {
                    Charset: 'UTF-8',
                    Data: 'HELLO This is the message body in text format.',
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: 'Test email TWO',
            },
        },
        Source: 'macrael@truss.works',
        // ReplyToAddresses: [],
    }

 */
