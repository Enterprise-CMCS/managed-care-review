import { APIGatewayProxyHandler } from 'aws-lambda'

// This endpoint exists to confirm that authentication is working
export const main: APIGatewayProxyHandler = async (event, context) => {

    // says hi
    const hello = {
        'hello': 'there',
    }

    console.log({"name": "hello",   // eslint-disable-line no-console
                    "identityID": event.requestContext.identity.cognitoIdentityId, 
                    "idenityProvider": event.requestContext.identity.cognitoAuthenticationProvider,
                    "authtype": event.requestContext.identity.cognitoAuthenticationType,
                    "user": event.requestContext.identity.user,
                    "identity": event.requestContext.identity,
                    "authorizer": event.requestContext.authorizer,
                    "everythin": event.requestContext,
                })

    console.log({"name": "No", "everything else": context})

    return {
        statusCode: 200,
        body: JSON.stringify(hello) + '\n',
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
        },
    };

}