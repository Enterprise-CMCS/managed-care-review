import { APIGatewayProxyHandler } from 'aws-lambda'

import { userFromAuthProvider, userFromCognitoAuthProvider, userFromLocalAuthProvider } from '../authn'


// This endpoint exists to confirm that authentication is working
export const main: APIGatewayProxyHandler = async (event) => {

    let userFetcher: userFromAuthProvider

    if (process.env.LOCAL_LOGIN) {
        userFetcher = userFromLocalAuthProvider
    } else {
        userFetcher = userFromCognitoAuthProvider
    }

    const authProvider = event.requestContext.identity.cognitoAuthenticationProvider;
    if (authProvider == undefined) {
        throw("nONONO")
    }

    const userResult = await userFetcher(authProvider)
    if (userResult.isErr()) {
        throw("bybyby")
    }

    const user = userResult.value

    // says hi
    const response = {
        email: user.email,
    }

    return {
        statusCode: 200,
        body: JSON.stringify(response) + '\n',
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
        },
    };

}