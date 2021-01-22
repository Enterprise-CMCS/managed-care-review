import { APIGatewayProxyHandler } from 'aws-lambda';

export const main: APIGatewayProxyHandler = async (event) => {

    console.log(event.body) // eslint-disable-line no-console

    return {
        statusCode: 200,
        body: '',
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
        },
    };

}