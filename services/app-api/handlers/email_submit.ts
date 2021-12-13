import { Handler } from 'aws-lambda'
import { sendSESEmail } from '../emailer'

export const main: Handler = async (event) => {
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                code: 'DATA_VALIDATION',
                message: 'Could not pull out email data from event.',
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }
    console.log('INFO: Sending SES Email: ', event.body)
    const sesResult = await sendSESEmail(event.body)

    if (!('MessageId' in sesResult)) {
        // we got an error back. This type narrows on the
        console.log('ERROR: Email send failed: ', sesResult)
        return {
            StatusCode: 500,
            body: JSON.stringify({
                code: 'EMAIL_FAILED',
                message: 'Could not send email. ' + sesResult,
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    console.log('Sent email: ', sesResult)
    console.info({
        message: 'email_submit succeeded',
        operation: 'email_submit',
        status: 'SUCCESS',
    })
    return sesResult
}
