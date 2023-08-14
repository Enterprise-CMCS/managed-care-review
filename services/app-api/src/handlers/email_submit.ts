import type { Handler } from 'aws-lambda'
import { SESServiceException } from '@aws-sdk/client-ses'
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
    console.info('INFO: Sending SES Email: ', event.body)

    const sesResult = await sendSESEmail(event.body)

    if (sesResult instanceof SESServiceException) {
        // we got an error back
        console.info('ERROR: Email send failed: ', sesResult.message)
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

    console.info('Sent email: ', sesResult)
    console.info({
        message: 'email_submit succeeded',
        operation: 'email_submit',
        status: 'SUCCESS',
    })
    return sesResult
}
