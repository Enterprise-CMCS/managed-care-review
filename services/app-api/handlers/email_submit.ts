import { Handler } from 'aws-lambda';
import { sendSESEmail } from '../emailer'

export const main: Handler = async (event) => {
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
        return await sendSESEmail(event.body).promise()
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


/* Sample event for use testing in lambda console
  {"body": 
    {"Destination":{
      "BccAddresses":[],"CcAddresses":[],"ToAddresses":["hana@truss.works"]
    },
    "Message":{
        "Body":{
            "Text":{
                "Data":"test",
                "Charset":"UTF-8"
            },
            "Html":{
                "Data":"test"}},
                "Subject":{
                    "Data":"This is a test",
                    "Charset":"UTF-8"}
                },
            "Source":"macrael@truss.works"
        }
    }
*/
