import type { Handler } from 'aws-lambda'
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { getPostgresURL } from './configuration'
import { NewPrismaClient } from '../postgres/prismaClient'
import { submissionEventsStage } from '../submissionEvents/config'
import { publishPendingSubmissionEvents } from '../submissionEvents/publish'

const sns = new SNSClient({
    maxAttempts: 3,
    requestHandler: { connectionTimeout: 2000, requestTimeout: 5000 },
})

export const main: Handler = async (_event, context) => {
    const stage = submissionEventsStage()
    const topicArn = process.env.SUBMISSION_EVENTS_TOPIC_ARN
    if (!stage || !topicArn)
        throw new Error(
            'Submission event POC is not enabled for this review stage'
        )
    const dbURL = process.env.DATABASE_URL
    if (!dbURL) throw new Error('DATABASE_URL is required')
    const connection = await getPostgresURL(
        dbURL,
        process.env.SECRETS_MANAGER_SECRET
    )
    if (connection instanceof Error) throw connection
    const client = await NewPrismaClient(connection)
    if (client instanceof Error) throw client

    const result = await publishPendingSubmissionEvents(
        client,
        stage,
        async (event) => {
            const response = await sns.send(
                new PublishCommand({
                    TopicArn: topicArn,
                    Message: JSON.stringify(event),
                    MessageAttributes: {
                        eventType: {
                            DataType: 'String',
                            StringValue: event.eventType,
                        },
                        envelopeVersion: {
                            DataType: 'Number',
                            StringValue: String(event.envelopeVersion),
                        },
                    },
                })
            )
            if (!response.MessageId)
                throw new Error('SNS did not return a message ID')
            return response.MessageId
        },
        {
            // Leave time for one bounded SDK operation and the final database update.
            hasTime: () => context.getRemainingTimeInMillis() > 20_000,
        }
    )
    console.info('Submission notification outbox sweep', { stage, ...result })
    if (result.failed)
        throw new Error(
            'Submission notification failures retained in outbox for retry'
        )
    return result
}
