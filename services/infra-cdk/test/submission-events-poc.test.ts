import { App, Stack } from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import {
    SubmissionEventsPoc,
    submissionEventsPocEnabled,
} from '../lib/constructs/submission-events-poc'

describe('submission events review POC', () => {
    it('requires opt-in and rejects official environments', () => {
        expect(submissionEventsPocEnabled('poc-events', undefined)).toBe(false)
        expect(submissionEventsPocEnabled('poc-events', 'true')).toBe(true)
        for (const stage of [
            'dev',
            'val',
            'qa',
            'prod',
            'main',
            'master',
            'production',
        ]) {
            expect(() => submissionEventsPocEnabled(stage, 'true')).toThrow(
                'review environment'
            )
        }
    })
    it('creates an encrypted topic and independent durable queue with raw delivery and dead letters', () => {
        const stack = new Stack(new App(), 'Test')
        const poc = new SubmissionEventsPoc(stack, 'Events', 'poc-events')
        const template = Template.fromStack(stack)
        template.resourceCountIs('AWS::SNS::Topic', 1)
        template.resourceCountIs('AWS::SQS::Queue', 2)
        template.hasResourceProperties('AWS::SNS::Topic', {
            KmsMasterKeyId: Match.anyValue(),
        })
        template.hasResourceProperties('AWS::SQS::Queue', {
            QueueName: 'stateportal-submissions-poc-events-arms',
            SqsManagedSseEnabled: true,
            MessageRetentionPeriod: 1209600,
            VisibilityTimeout: 120,
            RedrivePolicy: Match.objectLike({ maxReceiveCount: 5 }),
        })
        template.hasResourceProperties('AWS::SNS::Subscription', {
            Protocol: 'sqs',
            RawMessageDelivery: true,
            RedrivePolicy: Match.anyValue(),
        })
        template.hasResourceProperties('AWS::SQS::QueuePolicy', {
            PolicyDocument: Match.objectLike({
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Effect: 'Allow',
                        Principal: { Service: 'sns.amazonaws.com' },
                        Action: 'sqs:SendMessage',
                        Condition: {
                            ArnEquals: {
                                'aws:SourceArn': stack.resolve(
                                    poc.topic.topicArn
                                ),
                            },
                        },
                    }),
                ]),
            }),
        })
        expect(poc.consumerPolicy.actions).not.toContain('sqs:SendMessage')
        expect(poc.consumerPolicy.resources).toEqual([poc.queue.queueArn])
    })
})
