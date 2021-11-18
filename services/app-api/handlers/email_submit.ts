import { Handler } from 'aws-lambda';
import { sendEmail } from '../emailer'

export const main: Handler = async (event) => {
    console.log('EVENT', event.body)
    if (!event.body)
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
    try {
        const data = await sendEmail(event.body).promise()
        console.log('Send success!', data)
        return data
    } catch (err) {
        return {
            StatusCode: 400,
            body: JSON.stringify({
                code: 'EMAIL_FAILED',
                message: 'Could not send email. ' + err,
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }
}
   