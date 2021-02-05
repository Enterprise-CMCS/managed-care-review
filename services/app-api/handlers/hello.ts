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
        const authProvider = event.requestContext.identity.cognitoAuthenticationProvider;

        if (authProvider !== null) {
            // Cognito authentication provider looks like:
            // cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxxxxx,cognito-idp.us-east-1.amazonaws.com/us-east-1_aaaaaaaaa:CognitoSignIn:qqqqqqqq-1111-2222-3333-rrrrrrrrrrrr
            // Where us-east-1_aaaaaaaaa is the User Pool id
            // And qqqqqqqq-1111-2222-3333-rrrrrrrrrrrr is the User Pool User Id



            const parts = authProvider.split(':');
            const userPoolIdParts = parts[parts.length - 3].split('/');

            const userPoolId = userPoolIdParts[userPoolIdParts.length - 1];
            const userPoolUserId = parts[parts.length - 1];

            const user = await cognito.adminGetUser({Username: userPoolUserId, UserPoolId: userPoolId}).promise()

            console.log(JSON.stringify(user, null, 2)) // eslint-disable-line no-console

        } else {
            console.log("missing cognitoAuthenticationProvider info") // eslint-disable-line no-console
        }

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