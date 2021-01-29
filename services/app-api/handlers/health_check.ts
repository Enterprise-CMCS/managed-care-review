import { APIGatewayProxyHandler } from 'aws-lambda';

export const main: APIGatewayProxyHandler = async () => {

    // returns stage and version
    const health = {
        stage: process.env.stage,
        version: process.env.appVersion,
    }

    console.log({"name": "healthcheck"}) // eslint-disable-line no-console

    return {
        statusCode: 200,
        body: JSON.stringify(health) + '\n',
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
        },
    };

}