import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { submissionEventsStage } from './config'

const lambda = new LambdaClient({
    maxAttempts: 1,
    requestHandler: { connectionTimeout: 1000, requestTimeout: 2000 },
})

/** Best-effort post-commit wakeup; the scheduled sweep recovers missed wakeups. */
export async function wakeSubmissionEventPublisher(): Promise<void> {
    if (!submissionEventsStage()) return
    const functionName = process.env.SUBMISSION_EVENTS_PUBLISHER_FUNCTION_NAME
    if (!functionName) return
    try {
        await lambda.send(
            new InvokeCommand({
                FunctionName: functionName,
                InvocationType: 'Event',
                Payload: Buffer.from('{}'),
            })
        )
    } catch (error) {
        console.warn(
            'Submission notification publisher wakeup failed; scheduled recovery remains active',
            {
                errorName: error instanceof Error ? error.name : 'UnknownError',
            }
        )
    }
}
