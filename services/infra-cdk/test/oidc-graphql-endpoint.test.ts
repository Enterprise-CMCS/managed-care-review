import assert from 'node:assert/strict'
import { after, describe, it, mock } from 'node:test'
import { App, Stack, type CfnResource } from 'aws-cdk-lib'
import { Template, Match } from 'aws-cdk-lib/assertions'
import { RestApi } from 'aws-cdk-lib/aws-apigateway'
import { Function, Code, Runtime } from 'aws-cdk-lib/aws-lambda'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { BUNDLING_STACKS } from 'aws-cdk-lib/cx-api'
import { Vpc } from 'aws-cdk-lib/aws-ec2'
import type { Construct } from 'constructs'
import { OidcGraphqlEndpoint } from '../lib/constructs/api/oidc-graphql-endpoint'
import { AppApiStack } from '../lib/stacks/app-api'
import { getEnvironment } from '../lib/config/environments'

function app() {
    // Skip heavy existing application bundles in stack-structure assertions.
    // The isolated construct test below exercises real authorizer bundling.
    return new App({ context: { [BUNDLING_STACKS]: [] } })
}

function logicalId(stack: Stack, construct: Construct) {
    return stack.getLogicalId(construct.node.defaultChild as CfnResource)
}

void describe('deny-all OIDC REST foundation', () => {
    void it('adds only CUSTOM-auth GET/POST, inherits preflight, and isolates its authorizer', () => {
        const stack = new Stack(new App(), 'Test', {
            env: { account: '123456789012', region: 'us-east-1' },
        })
        const api = new RestApi(stack, 'Api', {
            defaultCorsPreflightOptions: {
                allowOrigins: ['https://example.invalid'],
                allowMethods: ['GET', 'POST', 'OPTIONS'],
                allowHeaders: ['Authorization', 'Content-Type'],
            },
        })
        const handler = new Function(stack, 'Graphql', {
            runtime: Runtime.NODEJS_24_X,
            handler: 'index.main',
            code: Code.fromInline(
                'exports.main = async () => ({statusCode: 200})'
            ),
        })

        new OidcGraphqlEndpoint(stack, 'Oidc', {
            graphqlResource: api.root.addResource('graphql'),
            graphqlHandler: handler,
            stage: 'test',
            logRetentionDays: RetentionDays.THREE_DAYS,
        })

        const template = Template.fromStack(stack)
        const resources = template.toJSON().Resources
        const oidcId = Object.keys(
            template.findResources('AWS::ApiGateway::Resource', {
                Properties: { PathPart: 'oidc' },
            })
        )[0]
        const [authorizerId, authorizer] = Object.entries(
            template.findResources('AWS::ApiGateway::Authorizer')
        )[0]
        assert.equal(authorizer.Properties.Type, 'TOKEN')
        assert.equal(
            authorizer.Properties.IdentitySource,
            'method.request.header.Authorization'
        )
        assert.equal(authorizer.Properties.AuthorizerResultTtlInSeconds, 0)

        for (const method of ['GET', 'POST']) {
            template.hasResourceProperties('AWS::ApiGateway::Method', {
                ResourceId: { Ref: oidcId },
                HttpMethod: method,
                AuthorizationType: 'CUSTOM',
                AuthorizerId: { Ref: authorizerId },
                Integration: {
                    Type: 'AWS_PROXY',
                    Uri: Match.objectLike({
                        'Fn::Join': Match.arrayWith([
                            Match.arrayWith([
                                {
                                    'Fn::GetAtt': [
                                        logicalId(stack, handler),
                                        'Arn',
                                    ],
                                },
                            ]),
                        ]),
                    }),
                },
            })
        }
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            ResourceId: { Ref: oidcId },
            HttpMethod: 'OPTIONS',
            AuthorizationType: 'NONE',
            Integration: { Type: 'MOCK' },
        })

        const authorizerFunction = Object.values(
            template.findResources('AWS::Lambda::Function', {
                Properties: {
                    FunctionName: 'app-api-test-cdk-oidc-authorizer',
                },
            })
        )[0]
        assert.ok(authorizerFunction)
        assert.equal(authorizerFunction.Properties.Runtime, 'nodejs24.x')
        assert.equal(authorizerFunction.Properties.Timeout, 5)
        assert.equal(authorizerFunction.Properties.Environment, undefined)
        assert.equal(authorizerFunction.Properties.VpcConfig, undefined)
        assert.notDeepEqual(
            authorizerFunction.Properties.Role,
            resources[logicalId(stack, handler)].Properties.Role
        )

        const roleId = authorizerFunction.Properties.Role['Fn::GetAtt'][0]
        assert.deepEqual(resources[roleId].Properties.ManagedPolicyArns, [
            {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        { Ref: 'AWS::Partition' },
                        ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                    ],
                ],
            },
        ])
        for (const policy of Object.values(
            template.findResources('AWS::IAM::Policy')
        )) {
            assert.ok(!JSON.stringify(policy.Properties.Roles).includes(roleId))
        }
        template.hasResourceProperties('AWS::Logs::LogGroup', {
            LogGroupName: '/aws/lambda/app-api-test-cdk-oidc-authorizer',
            RetentionInDays: 3,
        })
        template.resourceCountIs('AWS::SecretsManager::Secret', 0)
        template.resourceCountIs('AWS::SSM::Parameter', 0)
        assert.equal(template.toJSON().Parameters?.OIDCIssuer, undefined)
    })
})

void describe('AppApiStack compatibility', () => {
    const oldEnv = { ...process.env }
    after(() => {
        process.env = oldEnv
        mock.restoreAll()
    })

    mock.method(Vpc, 'fromLookup', (scope: Construct, id: string) =>
        Vpc.fromVpcAttributes(scope, id, {
            vpcId: 'vpc-00000000',
            availabilityZones: ['us-east-1a', 'us-east-1b'],
            privateSubnetIds: ['subnet-11111111', 'subnet-22222222'],
            privateSubnetRouteTableIds: ['rtb-11111111', 'rtb-22222222'],
            publicSubnetIds: ['subnet-33333333', 'subnet-44444444'],
            publicSubnetRouteTableIds: ['rtb-33333333', 'rtb-44444444'],
        })
    )

    for (const stage of ['dev', 'val', 'qa', 'prod', 'oidc-review']) {
        void it(`retains existing auth, WAF and logging in ${stage} without IDM config`, () => {
            process.env.VPC_ID = 'vpc-00000000'
            process.env.CDK_DEFAULT_ACCOUNT = '123456789012'
            process.env.AWS_REGION = 'us-east-1'
            process.env.DD_API_KEY = 'offline' // pragma: allowlist secret
            process.env.SYNTHETIC_DATA_ENABLED = 'false'
            const withDomain = stage !== 'oidc-review'
            if (withDomain) {
                process.env.API_DOMAIN_NAME = 'api.example.invalid'
                process.env.CLOUDFRONT_CERT_ARN =
                    'arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000'
            } else {
                delete process.env.API_DOMAIN_NAME
                delete process.env.CLOUDFRONT_CERT_ARN
            }

            const stack = new AppApiStack(app(), 'AppApi', {
                stage,
                stageConfig: getEnvironment(stage),
                serviceName: 'app-api',
            })
            const template = Template.fromStack(stack)
            const apiId = logicalId(stack, stack.apiGateway)
            const graphqlId = Object.keys(
                template.findResources('AWS::ApiGateway::Resource', {
                    Properties: {
                        PathPart: 'graphql',
                        ParentId: { 'Fn::GetAtt': [apiId, 'RootResourceId'] },
                    },
                })
            )[0]
            assert.ok(graphqlId)
            for (const method of ['GET', 'POST']) {
                template.hasResourceProperties('AWS::ApiGateway::Method', {
                    ResourceId: { Ref: graphqlId },
                    HttpMethod: method,
                    AuthorizationType: 'AWS_IAM',
                    AuthorizerId: Match.absent(),
                })
            }
            const externalId = Object.keys(
                template.findResources('AWS::ApiGateway::Resource', {
                    Properties: { PathPart: 'external' },
                })
            )[0]
            assert.ok(externalId)
            const machineAuthorizerId = Object.keys(
                template.findResources('AWS::ApiGateway::Authorizer', {
                    Properties: {
                        Name: `app-api-${stage}-cdk-third-party-authorizer`,
                    },
                })
            )[0]
            assert.ok(machineAuthorizerId)
            for (const method of ['GET', 'POST']) {
                template.hasResourceProperties('AWS::ApiGateway::Method', {
                    ResourceId: { Ref: externalId },
                    HttpMethod: method,
                    AuthorizationType: 'CUSTOM',
                    AuthorizerId: { Ref: machineAuthorizerId },
                })
            }
            template.resourceCountIs('AWS::ApiGateway::RestApi', 1)
            template.resourceCountIs('AWS::ApiGatewayV2::Api', 0)
            template.resourceCountIs('AWS::ApiGateway::Authorizer', 2)
            template.resourceCountIs('AWS::WAFv2::WebACL', 1)
            template.resourceCountIs('AWS::WAFv2::WebACLAssociation', 1)
            template.hasResourceProperties('AWS::WAFv2::WebACLAssociation', {
                ResourceArn: {
                    'Fn::Join': [
                        '',
                        [
                            'arn:aws:apigateway:us-east-1::/restapis/',
                            { Ref: apiId },
                            `/stages/${stage}`,
                        ],
                    ],
                },
            })
            template.resourceCountIs(
                'AWS::ApiGateway::DomainName',
                withDomain ? 1 : 0
            )
            if (withDomain) {
                template.hasResourceProperties('AWS::ApiGateway::DomainName', {
                    DomainName: 'api.example.invalid',
                    EndpointConfiguration: { Types: ['EDGE'] },
                })
                template.hasResourceProperties(
                    'AWS::ApiGateway::BasePathMapping',
                    {
                        RestApiId: { Ref: apiId },
                    }
                )
            }
            template.hasResourceProperties('AWS::ApiGateway::Stage', {
                StageName: stage,
                AccessLogSetting: withDomain
                    ? Match.objectLike({ DestinationArn: Match.anyValue() })
                    : Match.absent(),
            })
            for (const responseType of [
                'DEFAULT_4XX',
                'DEFAULT_5XX',
                'UNAUTHORIZED',
                'ACCESS_DENIED',
            ]) {
                template.hasResourceProperties(
                    'AWS::ApiGateway::GatewayResponse',
                    {
                        ResponseType: responseType,
                        ResponseParameters: Match.objectLike({
                            'gatewayresponse.header.Access-Control-Allow-Origin':
                                Match.anyValue(),
                        }),
                    }
                )
            }
            template.hasResourceProperties('AWS::Lambda::Function', {
                FunctionName: `app-api-${stage}-cdk-oidc-authorizer`,
                Environment: Match.absent(),
                VpcConfig: Match.absent(),
            })
        })
    }
})
