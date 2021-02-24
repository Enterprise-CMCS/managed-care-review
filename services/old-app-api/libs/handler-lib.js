import * as debug from './debug-lib'
import { RequestLogger } from './logger-lib'

export default function handler(lambda) {
    return async function (event, context) {
        let body, statusCode

        // Start debugger
        debug.init(event, context)
        const logger = new RequestLogger()

        logger.addKey('name', context.functionName)
        logger.addKey('http.path', event.path)
        logger.addKey('http.method', event.httpMethod)
        //TODO add date

        context.logger = logger

        try {
            // Run the Lambda
            body = await lambda(event, context)
            statusCode = 200
        } catch (e) {
            // Print debug messages
            debug.flush(e)

            logger.addError('UNEXPECTED_ERROR', e.message)

            body = { error: e.message }
            statusCode = 500
        }

        logger.addKey('http.status_code', statusCode)

        logger.writeLog()

        // Return HTTP response
        return {
            statusCode,
            body: JSON.stringify(body),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }
}
