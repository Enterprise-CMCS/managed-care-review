import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import { type Construct } from 'constructs'
import {
    NodejsFunction,
    type NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs'
import {
    RestApi,
    type IRestApi,
    LambdaIntegration,
} from 'aws-cdk-lib/aws-apigateway'
import {
    PolicyStatement,
    Effect,
    Role,
    ServicePrincipal,
    ManagedPolicy,
} from 'aws-cdk-lib/aws-iam'
import { CfnOutput, Duration, Fn } from 'aws-cdk-lib'
import { ResourceNames } from '../config'
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda'
import { CfnWebACL, CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2'
import path from 'path'

/**
 * App API stack - GraphQL API with Lambda functions and dedicated API Gateway
 */
export class AppApiStack extends BaseStack {
    // Lambda functions
    public readonly healthFunction: NodejsFunction
    public readonly emailSubmitFunction: NodejsFunction
    public readonly otelFunction: NodejsFunction
    public readonly thirdPartyApiAuthorizerFunction: NodejsFunction
    public readonly oauthTokenFunction: NodejsFunction
    public readonly cleanupFunction: NodejsFunction

    // TODO: Add remaining lambdas
    // public readonly graphqlFunction: NodejsFunction
    // public readonly zipKeysFunction: NodejsFunction
    // public readonly migrateFunction: NodejsFunction
    // public readonly auditFilesFunction: NodejsFunction
    // public readonly migrateDocumentZipsFunction: NodejsFunction

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            description:
                'App API - GraphQL Lambda functions and API Gateway integration',
        })

        // Create dedicated API Gateway for app-api
        const apiGateway = new RestApi(this, 'AppApiGateway', {
            restApiName: `${ResourceNames.apiName('app-api', this.stage)}-gateway`,
            description: 'API Gateway for app-api Lambda functions',
            deployOptions: {
                stageName: this.stage,
            },
            defaultCorsPreflightOptions: {
                allowOrigins: ['*'],
                allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowHeaders: ['Content-Type', 'Authorization'],
            },
        })

        // Create Lambda execution role
        const lambdaRole = this.createLambdaRole()

        // Get environment variables
        const environment = this.getLambdaEnvironment()

        // Create simple Lambda functions first (no VPC, layers, or complex dependencies)
        this.healthFunction = this.createFunction(
            'health',
            'health_check',
            'main',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                environment,
                role: lambdaRole,
            }
        )

        this.emailSubmitFunction = this.createFunction(
            'email-submit',
            'email_submit',
            'main',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                environment,
                role: lambdaRole,
            }
        )

        this.otelFunction = this.createFunction('otel', 'otel_proxy', 'main', {
            timeout: Duration.seconds(30),
            memorySize: 1024,
            environment,
            role: lambdaRole,
        })

        this.thirdPartyApiAuthorizerFunction = this.createFunction(
            'third-party-api-authorizer',
            'third_party_API_authorizer',
            'main',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                environment,
                role: lambdaRole,
            }
        )

        this.oauthTokenFunction = this.createFunction(
            'oauth-token',
            'oauth_token',
            'main',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                environment,
                role: lambdaRole,
            }
        )

        this.cleanupFunction = this.createFunction(
            'cleanup',
            'cleanup',
            'main',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                environment,
                role: lambdaRole,
            }
        )

        // TODO: Add remaining complex functions later (with VPC, layers, etc.)
        // this.graphqlFunction = this.createFunction('graphql', 'apollo_gql', 'gqlHandler', {...})
        // this.zipKeysFunction = this.createFunction('zip-keys', 'bulk_download', 'main', {...})
        // this.migrateFunction = this.createFunction('migrate', 'postgres_migrate', 'main', {...})
        // this.auditFilesFunction = this.createFunction('audit-files', 'audit_s3', 'main', {...})
        // this.migrateDocumentZipsFunction = this.createFunction('migrate-document-zips', 'migrate_document_zips', 'main', {...})

        // Create API Gateway resources and methods first
        this.setupApiGatewayRoutes(apiGateway)

        // Setup WAF association AFTER routes are configured (ensures deployment exists)
        this.setupWafAssociation(apiGateway)

        this.createOutputs()
    }

    private createFunction(
        functionName: string,
        handlerFile: string,
        handlerMethod: string,
        options: Partial<NodejsFunctionProps>
    ): NodejsFunction {
        return new NodejsFunction(this, `${functionName}Function`, {
            functionName: `${ResourceNames.apiName('app-api', this.stage)}-${functionName}`,
            runtime: Runtime.NODEJS_20_X,
            architecture: Architecture.X86_64,
            handler: handlerMethod,
            entry: path.join(
                __dirname,
                '..',
                '..',
                '..',
                'app-api',
                'src',
                'handlers',
                `${handlerFile}.ts`
            ),
            // Use CDK default bundling for now - will configure per function as needed
            ...options,
        })
    }

    private createLambdaRole(): Role {
        const role = new Role(this, 'LambdaExecutionRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName(
                    'service-role/AWSLambdaVPCAccessExecutionRole'
                ),
                ManagedPolicy.fromAwsManagedPolicyName(
                    'AWSXRayDaemonWriteAccess'
                ),
            ],
        })

        // Add all permissions from serverless configuration
        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['cognito-idp:ListUsers'],
                resources: ['*'],
            })
        )

        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'secretsmanager:GetSecretValue',
                    'secretsmanager:DescribeSecret',
                ],
                resources: ['*'],
            })
        )

        // Database permissions
        const postgresStackName = ResourceNames.stackName(
            'postgres',
            this.stage
        )
        const auroraArn = Fn.importValue(
            `${postgresStackName}-PostgresAuroraV2Arn`
        )
        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['rds-db:connect'],
                resources: [auroraArn],
            })
        )

        // SES permissions
        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['ses:SendEmail', 'ses:SendRawEmail'],
                resources: ['*'],
            })
        )

        // Lambda invoke permissions
        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['lambda:InvokeFunction'],
                resources: ['*'],
            })
        )

        // S3 permissions
        const uploadsStackName = ResourceNames.stackName('uploads', this.stage)
        console.info(`stack name: ${uploadsStackName}`)
        const documentUploadsBucketArn = Fn.importValue(
            `${uploadsStackName}-DocumentUploadsBucketArn`
        )
        const qaUploadsBucketArn = Fn.importValue(
            `${uploadsStackName}-QAUploadsBucketArn`
        )

        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:*'],
                resources: [
                    `${documentUploadsBucketArn}/allusers/*`,
                    `${qaUploadsBucketArn}/allusers/*`,
                    `${documentUploadsBucketArn}/zips/*`,
                ],
            })
        )

        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:ListBucket', 's3:GetBucketLocation'],
                resources: [documentUploadsBucketArn, qaUploadsBucketArn],
            })
        )

        // SSM permissions
        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['ssm:GetParameter', 'ssm:GetParameters'],
                resources: ['*'],
            })
        )

        // RDS snapshot permissions
        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'rds:CreateDBClusterSnapshot',
                    'rds:CreateDBSnapshot',
                    'rds:CopyDBClusterSnapshot',
                    'rds:CopyDBSnapshot',
                    'rds:DescribeDBClusterSnapshots',
                    'rds:DeleteDBClusterSnapshot',
                ],
                resources: ['*'],
            })
        )

        return role
    }

    private getLambdaEnvironment(): Record<string, string> {
        // Get values from other stacks
        const uploadsStackName = ResourceNames.stackName('uploads', this.stage)
        const frontendStackName = ResourceNames.stackName(
            'frontend',
            this.stage
        )

        const documentUploadsBucketName = Fn.importValue(
            `${uploadsStackName}-DocumentUploadsBucketName`
        )
        const qaUploadsBucketName = Fn.importValue(
            `${uploadsStackName}-QAUploadsBucketName`
        )
        const applicationEndpoint = Fn.importValue(
            `${frontendStackName}-CloudFrontEndpointUrl`
        )

        return {
            stage: this.stage,
            REGION: this.region,
            // Database URL will be resolved at runtime via secrets manager
            DATABASE_URL: process.env.DATABASE_URL || '',
            VITE_APP_AUTH_MODE: process.env.VITE_APP_AUTH_MODE || 'AWS_COGNITO',
            API_APP_OTEL_COLLECTOR_URL:
                process.env.API_APP_OTEL_COLLECTOR_URL || '',
            SECRETS_MANAGER_SECRET: `aurora_postgres_${this.stage}`,
            EMAILER_MODE: process.env.EMAILER_MODE || '',
            PARAMETER_STORE_MODE: process.env.PARAMETER_STORE_MODE || '',
            APPLICATION_ENDPOINT: applicationEndpoint,
            AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
            OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
            LD_SDK_KEY: process.env.LD_SDK_KEY || '',
            JWT_SECRET: process.env.JWT_SECRET || '',
            VITE_APP_S3_QA_BUCKET: qaUploadsBucketName,
            VITE_APP_S3_DOCUMENTS_BUCKET: documentUploadsBucketName,
        }
    }

    private setupApiGatewayRoutes(apiGateway: IRestApi): void {
        // Health check endpoint
        const healthResource = apiGateway.root.addResource('health_check')
        healthResource.addMethod(
            'GET',
            new LambdaIntegration(this.healthFunction),
            {
                methodResponses: [{ statusCode: '200' }],
            }
        )

        // OTEL endpoint
        const otelResource = apiGateway.root.addResource('otel')
        otelResource.addMethod('POST', new LambdaIntegration(this.otelFunction))

        // OAuth token endpoint
        const oauthResource = apiGateway.root.addResource('oauth')
        const tokenResource = oauthResource.addResource('token')
        tokenResource.addMethod(
            'POST',
            new LambdaIntegration(this.oauthTokenFunction)
        )

        // TODO: Add remaining complex routes later when functions are enabled

        // GraphQL endpoints
        // const graphqlResource = apiGateway.root.addResource('graphql')
        // graphqlResource.addMethod('POST', new LambdaIntegration(this.graphqlFunction), {...})
        // graphqlResource.addMethod('GET', new LambdaIntegration(this.graphqlFunction), {...})

        // External GraphQL with custom authorizer
        // const customAuthorizer = new RequestAuthorizer(this, 'ThirdPartyApiAuthorizer', {
        //     handler: this.thirdPartyApiAuthorizerFunction,
        //     identitySources: ['method.request.header.Authorization'],
        // })
        // const v1Resource = apiGateway.root.addResource('v1')
        // const v1GraphqlResource = v1Resource.addResource('graphql')
        // const externalResource = v1GraphqlResource.addResource('external')
        // externalResource.addMethod('POST', new LambdaIntegration(this.graphqlFunction), { authorizer: customAuthorizer })
        // externalResource.addMethod('GET', new LambdaIntegration(this.graphqlFunction), { authorizer: customAuthorizer })

        // Zip endpoint
        // const zipResource = apiGateway.root.addResource('zip')
        // zipResource.addMethod('POST', new LambdaIntegration(this.zipKeysFunction), { authorizationType: AuthorizationType.IAM })

        // Deployment and stage are automatically handled by RestApi construct
    }

    private setupWafAssociation(apiGateway: IRestApi): void {
        // Create WAF Web ACL for app-api
        const webAcl = new CfnWebACL(this, 'AppApiWebAcl', {
            scope: 'REGIONAL',
            defaultAction: { allow: {} },
            name: `${this.stage}-app-api-cdk-webacl`,
            rules: [
                {
                    name: `${this.stage}-AWS-AWSManagedRulesCommonRuleSet`,
                    priority: 1,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesCommonRuleSet',
                            excludedRules: [
                                {
                                    name: 'SizeRestrictions_BODY',
                                },
                            ],
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'CommonRuleSetMetric',
                    },
                },
            ],
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                sampledRequestsEnabled: true,
                metricName: `${this.stage}-app-api-webacl`,
            },
        })

        // Associate WAF with API Gateway stage
        const wafAssociation = new CfnWebACLAssociation(
            this,
            'ApiGwWebAclAssociation',
            {
                resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${apiGateway.restApiId}/stages/${this.stage}`,
                webAclArn: webAcl.attrArn,
            }
        )

        // Ensure WAF association happens after API Gateway deployment
        wafAssociation.node.addDependency(apiGateway)
    }

    private createOutputs(): void {
        new CfnOutput(this, 'HealthFunctionName', {
            value: this.healthFunction.functionName,
            exportName: this.exportName('HealthFunctionName'),
            description: 'Health check Lambda function name',
        })

        new CfnOutput(this, 'ApiAuthMode', {
            value: 'AWS_COGNITO',
            exportName: this.exportName('ApiAuthMode'),
            description: 'API authentication mode',
        })

        new CfnOutput(this, 'Region', {
            value: this.region,
            exportName: this.exportName('Region'),
            description: 'AWS Region',
        })

        new CfnOutput(this, 'OauthTokenFunctionName', {
            value: this.oauthTokenFunction.functionName,
            exportName: this.exportName('OauthTokenFunctionName'),
            description: 'OAuth token Lambda function name',
        })

        new CfnOutput(this, 'CleanupFunctionName', {
            value: this.cleanupFunction.functionName,
            exportName: this.exportName('CleanupFunctionName'),
            description: 'Cleanup Lambda function name',
        })

        // TODO: Add remaining function outputs when enabled
        // new CfnOutput(this, 'GraphqlFunctionName', {
        //     value: this.graphqlFunction.functionName,
        //     exportName: this.exportName('GraphqlFunctionName'),
        //     description: 'GraphQL Lambda function name',
        // })
    }
}
