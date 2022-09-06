import { Handler } from 'aws-lambda'
export const main: Handler = async () => {
    console.log('JJ RUNNING SCHEDULED HANDLER')
    return {
        statusCode: 200,
        body: 'scheduled handler ran',
    }
}
