import { Construct } from 'constructs'
import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import { AnyPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { Key } from 'aws-cdk-lib/aws-kms'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs'
import { isReviewEnvironment } from '../config/environments'

export function submissionEventsPocEnabled(
    stage: string,
    requested: string | undefined
): boolean {
    if (requested !== 'true') return false
    if (
        !isReviewEnvironment(stage) ||
        ['main', 'master', 'production'].includes(stage)
    ) {
        throw new Error(
            'Submission events POC can only be enabled in a branch review environment'
        )
    }
    return true
}

/** Infrastructure only. No consumer automatically removes demonstration messages. */
export class SubmissionEventsPoc extends Construct {
    readonly topic: Topic
    readonly queue: Queue
    readonly deadLetterQueue: Queue
    readonly consumerPolicy: PolicyStatement

    constructor(scope: Construct, id: string, stage: string) {
        super(scope, id)
        // Defend against bypassing the caller's review-only gate.
        submissionEventsPocEnabled(stage, 'true')
        const key = new Key(this, 'TopicKey', {
            enableKeyRotation: true,
            removalPolicy: RemovalPolicy.DESTROY,
            pendingWindow: Duration.days(7),
            description: `Review-only submission event topic encryption (${stage})`,
        })
        this.topic = new Topic(this, 'Topic', {
            topicName: `stateportal-submissions-${stage}`,
            masterKey: key,
        })
        this.topic.applyRemovalPolicy(RemovalPolicy.DESTROY)
        this.topic.addToResourcePolicy(
            new PolicyStatement({
                effect: Effect.DENY,
                principals: [new AnyPrincipal()],
                actions: ['sns:*'],
                resources: [this.topic.topicArn],
                conditions: { Bool: { 'aws:SecureTransport': 'false' } },
            })
        )
        this.deadLetterQueue = new Queue(this, 'DeadLetterQueue', {
            queueName: `stateportal-submissions-${stage}-dlq`,
            encryption: QueueEncryption.SQS_MANAGED,
            enforceSSL: true,
            retentionPeriod: Duration.days(14),
            removalPolicy: RemovalPolicy.DESTROY,
        })
        this.queue = new Queue(this, 'Queue', {
            queueName: `stateportal-submissions-${stage}-arms`,
            encryption: QueueEncryption.SQS_MANAGED,
            enforceSSL: true,
            retentionPeriod: Duration.days(14),
            visibilityTimeout: Duration.minutes(2),
            receiveMessageWaitTime: Duration.seconds(20),
            deadLetterQueue: {
                queue: this.deadLetterQueue,
                maxReceiveCount: 5,
            },
            removalPolicy: RemovalPolicy.DESTROY,
        })
        this.topic.addSubscription(
            new SqsSubscription(this.queue, {
                rawMessageDelivery: true,
                // Capture both exhausted consumer receives and failed SNS deliveries.
                deadLetterQueue: this.deadLetterQueue,
            })
        )
        // A declaration only: no IAM users, access keys or external trust are created.
        this.consumerPolicy = new PolicyStatement({
            actions: [
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:ChangeMessageVisibility',
                'sqs:GetQueueAttributes',
                'sqs:GetQueueUrl',
            ],
            resources: [this.queue.queueArn],
        })
    }
}
