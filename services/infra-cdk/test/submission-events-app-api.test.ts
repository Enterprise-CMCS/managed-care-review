import { App, type CfnElement } from 'aws-cdk-lib'
import type * as Lambda from 'aws-cdk-lib/aws-lambda'
import { Template, Match } from 'aws-cdk-lib/assertions'
import { Vpc } from 'aws-cdk-lib/aws-ec2'
import type { Construct } from 'constructs'
import type { NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs'
import { getEnvironment } from '../lib/config/environments'
import { AppApiStack } from '../lib/stacks/app-api'

// Exercise the real stack wiring/IAM/dependency graph without building every
// existing Lambda asset or making VPC/AWS lookups.
jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => {
    const lambda: typeof Lambda = jest.requireActual('aws-cdk-lib/aws-lambda')
    return {
        ...jest.requireActual('aws-cdk-lib/aws-lambda-nodejs'),
        NodejsFunction: class extends lambda.Function {
            constructor(
                scope: Construct,
                id: string,
                props: NodejsFunctionProps
            ) {
                super(scope, id, {
                    ...props,
                    runtime: props.runtime!,
                    handler: props.handler ?? 'index.main',
                    code: lambda.Code.fromInline(
                        'exports.main = async () => {};'
                    ),
                })
            }
        },
    }
})

function stack() {
    return new AppApiStack(new App(), 'Api', {
        stage: 'pocevents',
        stageConfig: getEnvironment('pocevents'),
        serviceName: 'app-api',
    })
}

describe('AppApi submission event wiring', () => {
    let originalEnv: NodeJS.ProcessEnv
    beforeEach(() => {
        originalEnv = { ...process.env }
        Object.assign(process.env, {
            DEV_ACCOUNT_ID: '111111111111',
            AWS_REGION: 'us-east-1',
            DD_API_KEY: 'test-only',
            JWT_SECRET: 'test-only',
            LD_SDK_KEY: 'test-only',
            MCREVIEW_OAUTH_ISSUER: 'test-only',
            OKTA_OAUTH_ISSUER: 'test-only',
            DATABASE_URL: 'AWS_SM',
            SYNTHETIC_DATA_ENABLED: 'false',
            SUBMISSION_EVENTS_POC_ENABLED: 'false',
        })
        jest.spyOn(console, 'info').mockImplementation(() => {})
        jest.spyOn(Vpc, 'fromLookup').mockImplementation((scope, id) =>
            Vpc.fromVpcAttributes(scope, id, {
                vpcId: 'vpc-test',
                availabilityZones: ['us-east-1a', 'us-east-1b'],
                privateSubnetIds: ['subnet-one', 'subnet-two'],
                privateSubnetRouteTableIds: ['rtb-one', 'rtb-two'],
            })
        )
    })
    afterEach(() => {
        process.env = originalEnv
        jest.restoreAllMocks()
    })

    it('does not add queues, a topic, publisher or capture flags when disabled', () => {
        const api = stack()
        const template = Template.fromStack(api)
        template.resourceCountIs('AWS::SNS::Topic', 0)
        template.resourceCountIs('AWS::SQS::Queue', 0)
        expect(api.submissionEventsPublisherFunction).toBeUndefined()
        const environment =
            template.toJSON().Resources[
                api.getLogicalId(
                    api.graphqlFunction.node.defaultChild as CfnElement
                )
            ].Properties.Environment.Variables
        expect(environment.SUBMISSION_EVENTS_POC_ENABLED).toBeUndefined()
    })
    it('wires a stage-scoped publisher, recovery rule and migration dependencies without cycles', () => {
        process.env.SUBMISSION_EVENTS_POC_ENABLED = 'true'
        const api = stack()
        // Template.fromStack checks cycles, including shared IAM role policies.
        const template = Template.fromStack(api)
        template.resourceCountIs('AWS::SNS::Topic', 1)
        template.resourceCountIs('AWS::SQS::Queue', 2)
        template.hasResourceProperties('AWS::Lambda::Function', {
            FunctionName: 'app-api-pocevents-cdk-publish-submission-events',
            ReservedConcurrentExecutions: 1,
            Timeout: 60,
            Environment: {
                Variables: Match.objectLike({
                    stage: 'pocevents',
                    SUBMISSION_EVENTS_POC_ENABLED: 'true',
                    SUBMISSION_EVENTS_TOPIC_ARN: Match.anyValue(),
                }),
            },
        })
        template.hasResourceProperties('AWS::Events::Rule', {
            ScheduleExpression: 'rate(1 minute)',
        })
        const publisher = api.submissionEventsPublisherFunction!
        const publisherId = api.getLogicalId(
            publisher.node.defaultChild as CfnElement
        )
        const resources = template.toJSON().Resources
        const triggerId = Object.keys(resources).find(
            (id) => resources[id].Type === 'Custom::Trigger'
        )!
        expect(resources[publisherId].DependsOn).toContain(triggerId)
        for (const resource of [
            api.graphqlFunction,
            api.submissionEventsRecoveryRule!,
        ]) {
            const id = api.getLogicalId(
                resource.node.defaultChild as CfnElement
            )
            expect(resources[id].DependsOn).toContain(triggerId)
        }
        const publisherPolicies = Object.values(resources).filter(
            (resource: any) =>
                resource.Type === 'AWS::IAM::Policy' &&
                JSON.stringify(resource.Properties.Roles).includes(
                    'SubmissionEventsPublisherRole'
                )
        ) as any[]
        expect(publisherPolicies).toHaveLength(1)
        const statements =
            publisherPolicies[0].Properties.PolicyDocument.Statement
        const publish = statements.find((statement: any) =>
            [statement.Action].flat().includes('sns:Publish')
        )
        expect(publish.Resource).not.toBe('*')
        expect(
            statements.some((statement: any) =>
                [statement.Action].flat().includes('sqs:ReceiveMessage')
            )
        ).toBe(false)
    })
})
