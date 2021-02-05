import { APIGatewayProxyHandler } from 'aws-lambda'
import { CognitoIdentityServiceProvider } from 'aws-sdk'


// This endpoint exists to confirm that authentication is working
export const main: APIGatewayProxyHandler = async (event, context) => {

    // says hi
    const hello = {
        'hello': 'there',
    }

    console.log("*** BEGIN ***") // eslint-disable-line no-console
    console.log(JSON.stringify(event, null, 2));// eslint-disable-line no-console
    console.log("*** Specifically, you want the identity info... should be in here: ")// eslint-disable-line no-console
    console.log(event.requestContext.identity);// eslint-disable-line no-console
    console.log("*** END ***");// eslint-disable-line no-console

    console.log({"name": "hello",   // eslint-disable-line no-console
                    "everythin": event,
                    "body": event.body,
                })

    const cognito = new CognitoIdentityServiceProvider()
    try {
        const user = await cognito.getUser().promise()

        console.log(JSON.stringify(user, null, 2)) // eslint-disable-line no-console
    } catch (e) {
        console.log("ERR", e) // eslint-disable-line no-console
    }

    console.log({"name": "No", "everything else": context}) // eslint-disable-line no-console

    return {
        statusCode: 200,
        body: JSON.stringify(hello) + '\n',
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
        },
    };

}