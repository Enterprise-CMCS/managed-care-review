import type {
    SESServiceException,
    SendEmailRequest,
    SendEmailResponse,
} from '@aws-sdk/client-ses'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import type { EmailData } from './'

const ses = new SESClient({ region: 'us-east-1' })

function getSESEmailParams(email: EmailData): SendEmailRequest {
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

    const emailParams: SendEmailRequest = {
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
    awsErr: SESServiceException

    constructor(awsErr: SESServiceException) {
        super(awsErr.message)
        this.awsErr = awsErr

        // Set the prototype explicitly.
        // this makes `instanceof` work correctly
        Object.setPrototypeOf(this, AWSResponseError.prototype)
    }
}

async function sendSESEmail(
    params: SendEmailRequest
): Promise<SendEmailResponse | SESServiceException> {
    console.info('SendEmailCommand params: ', params)
    const command = new SendEmailCommand(params)
    console.info('SendEmailCommand: ', command)
    return await ses.send(command)
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
