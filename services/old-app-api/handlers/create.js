import * as uuid from 'uuid';
import handler from './../libs/handler-lib';
import dynamoDb from './../libs/dynamodb-lib';

export const main = handler(async (event, context) => {
    const logger = context.logger;

    // If this invokation is a prewarm, do nothing and return.
    if (event.source == 'serverless-plugin-warmup') {
        logger.addKey('is_warmup', true);
        return null;
    }

    const data = JSON.parse(event.body);

    const nextValue = await dynamoDb
        .increment(data.territory)
        .done(function (value) {})
        .fail(function (error) {
            logger.addError('FAILED_INCREMENT', error);
        });

    const params = {
        TableName: process.env.tableName,
        Item: {
            userId: event.requestContext.identity.cognitoIdentityId,
            amendmentId: uuid.v1(),
            authProvider:
                event.requestContext.identity.cognitoAuthenticationProvider,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            transmittalNumber:
                data.territory + '-' + ('000' + nextValue).slice(-4),
            territory: data.territory,
            urgent: data.urgent,
            comments: data.comments,
            attachment: data.attachment,
            createdAt: Date.now(),
        },
    };

    await dynamoDb.put(params);

    logger.addKey('state', data.territory);

    return params.Item;
});
