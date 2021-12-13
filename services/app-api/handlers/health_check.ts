import { APIGatewayProxyHandler } from 'aws-lambda'
import { SES } from 'aws-sdk'

export const main: APIGatewayProxyHandler = async () => {
    // returns stage and version
    const health = {
        stage: process.env.stage,
        version: process.env.appVersion,
    }

    console.log('TRYING TO SEND A BARE EMAIL')

    const ses = new SES({ region: 'us-east-1' })

    var params = {
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
                Data: 'Test email ONE',
            },
        },
        ReplyToAddresses: [],
        ReturnPath: '',
        ReturnPathArn: '',
        Source: 'macrael@truss.works',
        SourceArn: '',
    }

    try {
        const result = await ses.sendEmail(params).promise()
        console.log('SEND RESULT', result)
    } catch (err) {
        console.log('FAILED TO SEND EMAIL', err)
    }

    console.log({ name: 'healthcheck' }) // eslint-disable-line no-console

    return {
        statusCode: 200,
        body: JSON.stringify(health) + '\n',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}
