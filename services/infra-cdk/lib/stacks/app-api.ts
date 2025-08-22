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
    Deployment,
    Stage,
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
import { CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2'
import * as path from 'path'

/**
 * App API stack - GraphQL API with Lambda functions
 * Matches the app-api serverless service functionality but uses existing infra-api Gateway
 */
export class AppApiStack extends BaseStack {
    // Start with simple lambdas only
    public readonly healthFunction: NodejsFunction
    public readonly emailSubmitFunction: NodejsFunction
    public readonly otelFunction: NodejsFunction
    public readonly thirdPartyApiAuthorizerFunction: NodejsFunction

    // TODO: Add complex lambdas later
    // public readonly graphqlFunction: NodejsFunction
    // public readonly oauthTokenFunction: NodejsFunction
    // public readonly zipKeysFunction: NodejsFunction
    // public readonly migrateFunction: NodejsFunction
    // public readonly cleanupFunction: NodejsFunction
    // public readonly auditFilesFunction: NodejsFunction
    // public readonly migrateDocumentZipsFunction: NodejsFunction

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            description:
                'App API - GraphQL Lambda functions and API Gateway integration',
        })

        // Import existing API Gateway from infra-api stack
        const infraApiStackName = ResourceNames.stackName(
            'InfraApi',
            this.stage
        )
        const apiGatewayId = Fn.importValue(
            `${infraApiStackName}-ApiGatewayRestApiId`
        )
        const apiGatewayRootResourceId = Fn.importValue(
            `${infraApiStackName}-AppApiGatewayRootResourceId`
        )
        const apiGateway = RestApi.fromRestApiAttributes(
            this,
            'ImportedApiGateway',
            {
                restApiId: apiGatewayId,
                rootResourceId: apiGatewayRootResourceId,
            }
        )

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

        // TODO: Add complex functions later (with VPC, layers, etc.)
        // this.graphqlFunction = this.createFunction('graphql', 'apollo_gql', 'gqlHandler', {...})
        // this.oauthTokenFunction = this.createFunction('oauth-token', 'oauth_token', 'main', {...})
        // this.zipKeysFunction = this.createFunction('zip-keys', 'bulk_download', 'main', {...})
        // this.migrateFunction = this.createFunction('migrate', 'postgres_migrate', 'main', {...})
        // this.cleanupFunction = this.createFunction('cleanup', 'cleanup', 'main', {...})
        // this.auditFilesFunction = this.createFunction('audit-files', 'audit_s3', 'main', {...})
        // this.migrateDocumentZipsFunction = this.createFunction('migrate-document-zips', 'migrate_document_zips', 'main', {...})

        // Create API Gateway resources and methods
        this.setupApiGatewayRoutes(apiGateway)

        // Setup WAF association (matches serverless dependencies)
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
            'Postgres',
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
        const uploadsStackName = ResourceNames.stackName('Uploads', this.stage)
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
        const uploadsStackName = ResourceNames.stackName('Uploads', this.stage)
        const frontendStackName = ResourceNames.stackName(
            'Frontend',
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

        // TODO: Add complex routes later when functions are enabled
        // OAuth token endpoint
        // const oauthResource = apiGateway.root.addResource('oauth')
        // const tokenResource = oauthResource.addResource('token')
        // tokenResource.addMethod('POST', new LambdaIntegration(this.oauthTokenFunction))

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

        // Create a new deployment to include all the new methods
        const deployment = new Deployment(this, 'ApiDeployment', {
            api: apiGateway,
            description: `App API deployment for ${this.stage}`,
        })

        // Create stage
        new Stage(this, 'ApiStage', {
            deployment,
            stageName: this.stage,
        })
    }

    private setupWafAssociation(apiGateway: IRestApi): void {
        // Import WAF ACL ARN from infra-api stack
        const infraApiStackName = ResourceNames.stackName(
            'InfraApi',
            this.stage
        )
        const wafAclArn = Fn.importValue(`${infraApiStackName}-WafPluginAclArn`)

        // Associate WAF with API Gateway stage
        new CfnWebACLAssociation(this, 'ApiGwWebAclAssociation', {
            resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${apiGateway.restApiId}/stages/${this.stage}`,
            webAclArn: wafAclArn,
        })
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

        // TODO: Add GraphQL function output when enabled
        // new CfnOutput(this, 'GraphqlFunctionName', {
        //     value: this.graphqlFunction.functionName,
        //     exportName: this.exportName('GraphqlFunctionName'),
        //     description: 'GraphQL Lambda function name',
        // })
    }
}
