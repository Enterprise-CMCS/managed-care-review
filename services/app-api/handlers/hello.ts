import { APIGatewayProxyHandler } from 'aws-lambda'

// This endpoint exists to confirm that authentication is working
export const main: APIGatewayProxyHandler = async (event) => {

    // says hi
    const hello = {
        'hello': 'there',
    }

    console.log({"name": "hello", "user": event.requestContext.identity.cognitoIdentityId, "idenityProvider": event.requestContext.identity.cognitoAuthenticationProvider}) // eslint-disable-line no-console

    return {
        statusCode: 200,
        body: JSON.stringify(hello) + '\n',
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
        },
    };

}