import { APIGatewayProxyHandler } from "aws-lambda";

import {
    userFromAuthProvider,
    userFromCognitoAuthProvider,
    userFromLocalAuthProvider,
} from "../authn";

// This endpoint exists to confirm that authentication is working
export const main: APIGatewayProxyHandler = async (event) => {
    let userFetcher: userFromAuthProvider;

    if (process.env.REACT_APP_LOCAL_LOGIN) {
        userFetcher = userFromLocalAuthProvider;
    } else {
        userFetcher = userFromCognitoAuthProvider;
    }

    const authProvider =
        event.requestContext.identity.cognitoAuthenticationProvider;
    if (authProvider == undefined) {
        return {
            statusCode: 400,
            body:
                JSON.stringify({
                    code: "NO_AUTH_PROVIDER",
                    message:
                        "auth provider missing. This should always be taken care of by the API Gateway",
                }) + "\n",
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": true,
            },
        };
    }

    const userResult = await userFetcher(authProvider);
    if (userResult.isErr()) {
        return {
            statusCode: 400,
            body:
                JSON.stringify({
                    code: "NO_USER",
                    message:
                        "user didn't resolve. This may be a failure of Cognito",
                }) +
                "\n" +
                userResult.error.message,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": true,
            },
        };
    }

    const user = userResult.value;

    // says hi
    const response = {
        email: user.email,
    };

    return {
        statusCode: 200,
        body: JSON.stringify(response) + "\n",
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
        },
    };
};
