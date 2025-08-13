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
    AuthorizationType,
    RequestAuthorizer,
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
import { Vpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import { CfnOutput, Duration, Fn, Size } from 'aws-cdk-lib'
import { ResourceNames } from '../config'
import { getAppApiLambdaConfig } from '../constructs/lambda/app-api-lambda-config'
import { LayerVersion, Runtime, Architecture } from 'aws-cdk-lib/aws-lambda'
import { CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2'
import * as path from 'path'

/**
 * App API stack - GraphQL API with Lambda functions
 * Matches the app-api serverless service functionality but uses existing infra-api Gateway
 */
export class AppApiStack extends BaseStack {
    public readonly graphqlFunction: NodejsFunction
    public readonly healthFunction: NodejsFunction
    public readonly oauthTokenFunction: NodejsFunction
    public readonly zipKeysFunction: NodejsFunction
    public readonly migrateFunction: NodejsFunction
    public readonly emailSubmitFunction: NodejsFunction
    public readonly otelFunction: NodejsFunction
    public readonly cleanupFunction: NodejsFunction
    public readonly auditFilesFunction: NodejsFunction
    public readonly migrateDocumentZipsFunction: NodejsFunction
    public readonly thirdPartyApiAuthorizerFunction: NodejsFunction

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

        // Import VPC and security groups from network stack
        const vpcId = StringParameter.valueFromLookup(
            this,
            `/mcr-cdk/${this.stage}/network/vpc-id`
        )
        const vpc = Vpc.fromLookup(this, 'Vpc', { vpcId })

        const sgId = StringParameter.valueFromLookup(
            this,
            `/mcr-cdk/${this.stage}/network/lambda-sg-id`
        )
        const securityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            'LambdaSecurityGroup',
            sgId
        )

        // Import Lambda layers
        const prismaEngineLayerArn = StringParameter.valueFromLookup(
            this,
            `/mcr-cdk/${this.stage}/layers/prisma-engine-layer-arn`
        )
        const prismaMigrationLayerArn = StringParameter.valueFromLookup(
            this,
            `/mcr-cdk/${this.stage}/layers/prisma-migration-layer-arn`
        )
        const otelLayerArn =
            'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4'

        const prismaEngineLayer = LayerVersion.fromLayerVersionArn(
            this,
            'PrismaEngineLayer',
            prismaEngineLayerArn
        )
        const prismaMigrationLayer = LayerVersion.fromLayerVersionArn(
            this,
            'PrismaMigrationLayer',
            prismaMigrationLayerArn
        )
        const otelLayer = LayerVersion.fromLayerVersionArn(
            this,
            'OtelLayer',
            otelLayerArn
        )

        // Create Lambda execution role
        const lambdaRole = this.createLambdaRole()

        // Get environment variables
        const environment = this.getLambdaEnvironment()

        // Create Lambda functions using NodejsFunction with proper bundling
        this.graphqlFunction = this.createFunction(
            'graphql',
            'apollo_gql',
            'gqlHandler',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                layers: [prismaEngineLayer, otelLayer],
                vpc,
                securityGroups: [securityGroup],
                environment,
                role: lambdaRole,
            }
        )

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

        this.oauthTokenFunction = this.createFunction(
            'oauth-token',
            'oauth_token',
            'main',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                layers: [prismaEngineLayer, otelLayer],
                vpc,
                securityGroups: [securityGroup],
                environment,
                role: lambdaRole,
            }
        )

        this.zipKeysFunction = this.createFunction(
            'zip-keys',
            'bulk_download',
            'main',
            {
                timeout: Duration.seconds(60),
                memorySize: this.stage === 'prod' ? 4096 : 1024,
                ephemeralStorageSize:
                    this.stage === 'prod'
                        ? Size.mebibytes(2048)
                        : Size.mebibytes(512),
                environment,
                role: lambdaRole,
            }
        )

        this.migrateFunction = this.createFunction(
            'migrate',
            'postgres_migrate',
            'main',
            {
                timeout: Duration.seconds(60),
                memorySize: 1024,
                layers: [prismaMigrationLayer, otelLayer],
                vpc,
                securityGroups: [securityGroup],
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

        this.cleanupFunction = this.createFunction(
            'cleanup',
            'cleanup',
            'main',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                layers: [otelLayer],
                environment,
                role: lambdaRole,
            }
        )

        this.auditFilesFunction = this.createFunction(
            'audit-files',
            'audit_s3',
            'main',
            {
                timeout: Duration.seconds(60),
                memorySize: 1024,
                layers: [prismaEngineLayer, otelLayer],
                vpc,
                securityGroups: [securityGroup],
                environment,
                role: lambdaRole,
            }
        )

        this.migrateDocumentZipsFunction = this.createFunction(
            'migrate-document-zips',
            'migrate_document_zips',
            'main',
            {
                timeout: Duration.minutes(15),
                memorySize: this.stage === 'prod' ? 4096 : 1024,
                ephemeralStorageSize:
                    this.stage === 'prod'
                        ? Size.mebibytes(2048)
                        : Size.mebibytes(512),
                layers: [prismaEngineLayer, otelLayer],
                vpc,
                securityGroups: [securityGroup],
                environment,
                role: lambdaRole,
            }
        )

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
            bundling: getAppApiLambdaConfig(functionName, this.stage),
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
            DATABASE_URL: `postgresql://placeholder:placeholder@placeholder:5432/postgres?schema=public&connection_limit=5`,
            VITE_APP_AUTH_MODE: 'AWS_COGNITO',
            API_APP_OTEL_COLLECTOR_URL: StringParameter.valueFromLookup(
                this,
                '/configuration/api_app_otel_collector_url'
            ),
            SECRETS_MANAGER_SECRET: `aurora_postgres_${this.stage}`,
            EMAILER_MODE: StringParameter.valueFromLookup(
                this,
                '/configuration/emailer_mode'
            ),
            PARAMETER_STORE_MODE: StringParameter.valueFromLookup(
                this,
                '/configuration/parameterStoreMode'
            ),
            APPLICATION_ENDPOINT: applicationEndpoint,
            AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
            OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
            LD_SDK_KEY: StringParameter.valueFromLookup(
                this,
                '/configuration/ld_sdk_key_feds'
            ),
            JWT_SECRET: StringParameter.valueFromLookup(
                this,
                `/aws/reference/secretsmanager/api_jwt_secret_${this.stage}`
            ),
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

        // OAuth token endpoint
        const oauthResource = apiGateway.root.addResource('oauth')
        const tokenResource = oauthResource.addResource('token')
        tokenResource.addMethod(
            'POST',
            new LambdaIntegration(this.oauthTokenFunction)
        )

        // OTEL endpoint
        const otelResource = apiGateway.root.addResource('otel')
        otelResource.addMethod('POST', new LambdaIntegration(this.otelFunction))

        // GraphQL endpoint with IAM authorization
        const graphqlResource = apiGateway.root.addResource('graphql')
        graphqlResource.addMethod(
            'POST',
            new LambdaIntegration(this.graphqlFunction),
            {
                authorizationType: AuthorizationType.IAM,
            }
        )
        graphqlResource.addMethod(
            'GET',
            new LambdaIntegration(this.graphqlFunction),
            {
                authorizationType: AuthorizationType.IAM,
            }
        )

        // External GraphQL endpoint with custom authorizer
        const v1Resource = apiGateway.root.addResource('v1')
        const v1GraphqlResource = v1Resource.addResource('graphql')
        const externalResource = v1GraphqlResource.addResource('external')

        // Create custom authorizer
        const customAuthorizer = new RequestAuthorizer(
            this,
            'ThirdPartyApiAuthorizer',
            {
                handler: this.thirdPartyApiAuthorizerFunction,
                identitySources: ['method.request.header.Authorization'],
            }
        )

        externalResource.addMethod(
            'POST',
            new LambdaIntegration(this.graphqlFunction),
            {
                authorizer: customAuthorizer,
            }
        )
        externalResource.addMethod(
            'GET',
            new LambdaIntegration(this.graphqlFunction),
            {
                authorizer: customAuthorizer,
            }
        )

        // Zip endpoint with IAM authorization
        const zipResource = apiGateway.root.addResource('zip')
        zipResource.addMethod(
            'POST',
            new LambdaIntegration(this.zipKeysFunction),
            {
                authorizationType: AuthorizationType.IAM,
            }
        )

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
        new CfnOutput(this, 'GraphqlFunctionName', {
            value: this.graphqlFunction.functionName,
            exportName: this.exportName('GraphqlFunctionName'),
            description: 'GraphQL Lambda function name',
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
    }
}
