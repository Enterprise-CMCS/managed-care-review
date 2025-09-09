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
    RequestAuthorizer,
    AuthorizationType,
    ResponseType,
} from 'aws-cdk-lib/aws-apigateway'
import {
    PolicyStatement,
    Effect,
    Role,
    ServicePrincipal,
    ManagedPolicy,
} from 'aws-cdk-lib/aws-iam'
import { CfnOutput, Duration, Fn } from 'aws-cdk-lib'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { ResourceNames } from '../config'
import {
    Architecture,
    Runtime,
    LayerVersion,
    Code,
} from 'aws-cdk-lib/aws-lambda'
import { CfnWebACL, CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2'
import { SubnetType, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2'
import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { AWS_OTEL_LAYER_ARN } from './lambda-layers'
import { ApiEndpoint } from '../constructs/api/api-endpoint'
import path from 'path'

/**
 * App API stack - GraphQL API with Lambda functions and dedicated API Gateway
 */
export class AppApiStack extends BaseStack {
    // API Gateway
    public readonly apiGateway: RestApi

    // Lambda functions
    public readonly healthFunction: NodejsFunction
    public readonly emailSubmitFunction: NodejsFunction
    public readonly otelFunction: NodejsFunction
    public readonly thirdPartyApiAuthorizerFunction: NodejsFunction
    public readonly oauthTokenFunction: NodejsFunction
    public readonly cleanupFunction: NodejsFunction
    public readonly migrateFunction: NodejsFunction

    public readonly graphqlFunction: NodejsFunction

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            description:
                'App API - GraphQL Lambda functions and API Gateway integration',
        })

        // Create dedicated API Gateway for app-api
        this.apiGateway = new RestApi(this, 'AppApiGateway', {
            restApiName: `${ResourceNames.apiName('app-api', this.stage)}-gateway`,
            description: 'API Gateway for app-api Lambda functions',
            deployOptions: {
                stageName: this.stage,
            },
            defaultCorsPreflightOptions: {
                allowOrigins: ['*'],
                allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowHeaders: [
                    'Content-Type',
                    'Authorization',
                    'x-amzn-trace-id',
                    'x-amzn-requestid',
                    'x-amz-date',
                    'x-api-key',
                    'x-amz-security-token',
                ],
            },
        })

        // Add Gateway Responses to ensure CORS headers are included in error responses
        this.apiGateway.addGatewayResponse('Default4xx', {
            type: ResponseType.DEFAULT_4XX,
            responseHeaders: {
                'Access-Control-Allow-Origin': "'*'",
                'Access-Control-Allow-Headers':
                    "'Content-Type,Authorization,x-amzn-trace-id,x-amzn-requestid,x-amz-date,x-api-key,x-amz-security-token'",
                'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
            },
        })

        this.apiGateway.addGatewayResponse('Default5xx', {
            type: ResponseType.DEFAULT_5XX,
            responseHeaders: {
                'Access-Control-Allow-Origin': "'*'",
                'Access-Control-Allow-Headers':
                    "'Content-Type,Authorization,x-amzn-trace-id,x-amzn-requestid,x-amz-date,x-api-key,x-amz-security-token'",
                'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
            },
        })

        this.apiGateway.addGatewayResponse('Unauthorized', {
            type: ResponseType.UNAUTHORIZED,
            responseHeaders: {
                'Access-Control-Allow-Origin': "'*'",
                'Access-Control-Allow-Headers':
                    "'Content-Type,Authorization,x-amzn-trace-id,x-amzn-requestid,x-amz-date,x-api-key,x-amz-security-token'",
                'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
            },
        })

        this.apiGateway.addGatewayResponse('AccessDenied', {
            type: ResponseType.ACCESS_DENIED,
            responseHeaders: {
                'Access-Control-Allow-Origin': "'*'",
                'Access-Control-Allow-Headers':
                    "'Content-Type,Authorization,x-amzn-trace-id,x-amzn-requestid,x-amz-date,x-api-key,x-amz-security-token'",
                'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
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

        // OTEL function needs the ADOT layer and collector.yml file
        const otelLayer = LayerVersion.fromLayerVersionArn(
            this,
            'OtelProxyOtelLayer',
            AWS_OTEL_LAYER_ARN
        )

        this.otelFunction = new NodejsFunction(this, 'otelFunction', {
            functionName: `${ResourceNames.apiName('app-api', this.stage)}-otel`,
            runtime: Runtime.NODEJS_20_X,
            architecture: Architecture.X86_64,
            handler: 'main',
            entry: path.join(
                __dirname,
                '..',
                '..',
                '..',
                'app-api',
                'src',
                'handlers',
                'otel_proxy.ts'
            ),
            timeout: Duration.seconds(30),
            memorySize: 1024,
            environment,
            role: lambdaRole,
            layers: [otelLayer],
            bundling: {
                commandHooks: {
                    beforeBundling(
                        inputDir: string,
                        outputDir: string
                    ): string[] {
                        return [
                            `echo "CDK OTEL inputDir: ${inputDir}"`,
                            `find ${inputDir} -name "collector.yml" 2>/dev/null || true`,
                        ]
                    },
                    beforeInstall(): string[] {
                        return []
                    },
                    afterBundling(
                        inputDir: string,
                        outputDir: string
                    ): string[] {
                        const repoRoot =
                            '/home/runner/work/managed-care-review/managed-care-review'
                        const appApiPath = `${repoRoot}/services/app-api`
                        return [
                            // Copy collector.yml for OTEL configuration
                            `cp ${appApiPath}/collector.yml ${outputDir}/collector.yml || echo "collector.yml not found at ${appApiPath}/collector.yml"`,
                        ]
                    },
                },
            },
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

        // Create migrate function with VPC and layers
        this.migrateFunction = this.createMigrateFunction(
            lambdaRole,
            environment
        )

        // Create GraphQL function with VPC and layers
        this.graphqlFunction = this.createGraphqlFunction(
            lambdaRole,
            environment
        )

        // Create API Gateway resources and methods first
        this.setupApiGatewayRoutes(this.apiGateway)

        // Setup WAF association AFTER routes are configured (ensures deployment exists)
        this.setupWafAssociation(this.apiGateway)

        // Setup cleanup function cron schedule
        this.setupCleanupSchedule()

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

    /**
     * Create the migrate function with VPC, layers, and extended permissions
     */
    private createMigrateFunction(
        role: Role,
        environment: Record<string, string>
    ): NodejsFunction {
        // Import VPC and security group
        const vpcId = process.env.VPC_ID
        const sgId = process.env.SG_ID

        if (!vpcId || !sgId) {
            throw new Error(
                'Missing required environment variables: VPC_ID, SG_ID for migrate function'
            )
        }

        const vpc = Vpc.fromLookup(this, 'ImportedVpc', {
            vpcId,
        })

        const lambdaSecurityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            'ImportedSecurityGroup',
            sgId
        )

        const prismaMigrationLayer = new LayerVersion(
            this,
            'PrismaMigrationLayer',
            {
                layerVersionName: `${ResourceNames.apiName('app-api', this.stage)}-prisma-migration`,
                description: 'Prisma migration layer for app-api',
                compatibleRuntimes: [Runtime.NODEJS_20_X],
                compatibleArchitectures: [Architecture.X86_64],
                code: Code.fromAsset(
                    path.join(
                        __dirname,
                        '..',
                        '..',
                        'lambda-layers-prisma-client-migration'
                    )
                ),
            }
        )

        // Use centralized OTEL layer ARN constant
        const otelLayer = LayerVersion.fromLayerVersionArn(
            this,
            'OtelLayer',
            AWS_OTEL_LAYER_ARN
        )

        // Create migrate function with all required configuration
        const migrateFunction = new NodejsFunction(this, 'migrateFunction', {
            functionName: `${ResourceNames.apiName('app-api', this.stage)}-migrate`,
            runtime: Runtime.NODEJS_20_X,
            architecture: Architecture.X86_64,
            handler: 'main',
            entry: path.join(
                __dirname,
                '..',
                '..',
                '..',
                'app-api',
                'src',
                'handlers',
                'postgres_migrate.ts'
            ),
            timeout: Duration.seconds(60), // Extended timeout for DB operations
            memorySize: 1024,
            environment: {
                ...environment,
                SCHEMA_PATH: '/opt/nodejs/prisma/schema.prisma',
                CONNECT_TIMEOUT: '60',
                NODE_PATH: '/opt/nodejs/node_modules',
            },
            role,
            layers: [prismaMigrationLayer, otelLayer],
            vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [lambdaSecurityGroup],
            bundling: {
                externalModules: ['prisma', '@prisma/client', '.prisma'],
                commandHooks: {
                    beforeBundling(
                        inputDir: string,
                        outputDir: string
                    ): string[] {
                        return [
                            `echo "CDK inputDir: ${inputDir}"`,
                            `find ${inputDir} -name "collector.yml" 2>/dev/null || true`,
                        ]
                    },
                    beforeInstall(): string[] {
                        return []
                    },
                    afterBundling(
                        inputDir: string,
                        outputDir: string
                    ): string[] {
                        // Same bundling commands as GraphQL function for consistency
                        const repoRoot =
                            '/home/runner/work/managed-care-review/managed-care-review'
                        const appApiPath = `${repoRoot}/services/app-api`
                        return [
                            // Copy collector.yml for OTEL configuration
                            `cp ${appApiPath}/collector.yml ${outputDir}/collector.yml || echo "collector.yml not found at ${appApiPath}/collector.yml"`,
                        ]
                    },
                },
                esbuildArgs: {
                    '--loader:.graphql': 'text',
                    '--loader:.gql': 'text',
                },
            },
        })

        // Grant additional RDS permissions for snapshot creation
        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'rds:CreateDBClusterSnapshot',
                    'rds:DescribeDBClusterSnapshots',
                    'rds:DescribeDBClusters',
                ],
                resources: ['*'],
            })
        )

        return migrateFunction
    }

    /**
     * Create the GraphQL function with VPC, layers, and extended timeout
     */
    private createGraphqlFunction(
        role: Role,
        environment: Record<string, string>
    ): NodejsFunction {
        // Import VPC and security group (same as migrate function)
        const vpcId = process.env.VPC_ID
        const sgId = process.env.SG_ID

        if (!vpcId || !sgId) {
            throw new Error(
                'Missing required environment variables: VPC_ID, SG_ID for GraphQL function'
            )
        }

        const vpc = Vpc.fromLookup(this, 'GraphqlVpc', {
            vpcId,
        })

        const lambdaSecurityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            'GraphqlSecurityGroup',
            sgId
        )

        const prismaEngineLayer = new LayerVersion(this, 'PrismaEngineLayer', {
            layerVersionName: `${ResourceNames.apiName('app-api', this.stage)}-prisma-engine`,
            description: 'Prisma engine layer for app-api',
            compatibleRuntimes: [Runtime.NODEJS_20_X],
            compatibleArchitectures: [Architecture.X86_64],
            code: Code.fromAsset(
                path.join(
                    __dirname,
                    '..',
                    '..',
                    'lambda-layers-prisma-client-engine'
                )
            ),
        })

        // Use centralized OTEL layer ARN constant
        const otelLayer = LayerVersion.fromLayerVersionArn(
            this,
            'GraphqlOtelLayer',
            AWS_OTEL_LAYER_ARN
        )

        // Create GraphQL function with all required configuration
        const graphqlFunction = new NodejsFunction(this, 'graphqlFunction', {
            functionName: `${ResourceNames.apiName('app-api', this.stage)}-graphql`,
            runtime: Runtime.NODEJS_20_X,
            architecture: Architecture.X86_64,
            handler: 'gqlHandler',
            entry: path.join(
                __dirname,
                '..',
                '..',
                '..',
                'app-api',
                'src',
                'handlers',
                'apollo_gql.ts'
            ),
            timeout: Duration.seconds(30), // Extended timeout for GraphQL operations
            memorySize: 1024,
            environment,
            role,
            layers: [prismaEngineLayer, otelLayer],
            vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [lambdaSecurityGroup],
            // Custom bundling to handle .graphql files and other assets
            bundling: {
                minify: false,
                sourceMap: true,
                target: 'node20',
                externalModules: ['prisma', '@prisma/client'],
                commandHooks: {
                    beforeBundling(
                        inputDir: string,
                        outputDir: string
                    ): string[] {
                        return [
                            // Debug: show what's in the inputDir and find our files
                            `echo "CDK inputDir: ${inputDir}"`,
                            `ls -la ${inputDir} || true`,
                            `find ${inputDir} -name "collector.yml" 2>/dev/null || true`,
                            `find ${inputDir} -name "etaTemplates" -type d 2>/dev/null || true`,
                        ]
                    },
                    beforeInstall(): string[] {
                        return []
                    },
                    afterBundling(
                        inputDir: string,
                        outputDir: string
                    ): string[] {
                        // Use absolute path to the app-api directory since CDK bundling
                        // runs from the cdk directory, not app-api directory
                        const repoRoot =
                            '/home/runner/work/managed-care-review/managed-care-review'
                        const appApiPath = `${repoRoot}/services/app-api`
                        return [
                            // Copy collector.yml for OTEL configuration
                            `cp ${appApiPath}/collector.yml ${outputDir}/collector.yml || echo "collector.yml not found at ${appApiPath}/collector.yml"`,
                            // Copy eta templates for email functionality to correct location
                            `mkdir -p ${outputDir}/etaTemplates || true`,
                            `cp -r ${appApiPath}/src/emailer/etaTemplates/* ${outputDir}/etaTemplates/ || echo "etaTemplates not found at ${appApiPath}/src/emailer/etaTemplates/"`,
                        ]
                    },
                },
                esbuildArgs: {
                    '--loader:.graphql': 'text',
                    '--loader:.gql': 'text',
                },
            },
        })

        return graphqlFunction
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
            'frontend-infra',
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

        // Get values from environment variables with SSM/Secrets Manager fallbacks
        const otelCollectorUrl =
            process.env.API_APP_OTEL_COLLECTOR_URL ||
            StringParameter.valueForStringParameter(
                this,
                '/configuration/api_app_otel_collector_url'
            )

        const emailerMode =
            process.env.EMAILER_MODE ||
            StringParameter.valueForStringParameter(
                this,
                '/configuration/emailer_mode'
            )

        const parameterStoreMode =
            process.env.PARAMETER_STORE_MODE ||
            StringParameter.valueForStringParameter(
                this,
                '/configuration/parameterStoreMode'
            )

        const ldSdkKey =
            process.env.LD_SDK_KEY ||
            StringParameter.valueForStringParameter(
                this,
                '/configuration/ld_sdk_key_feds'
            )

        // JWT Secret from Secrets Manager - reference secret created by postgres stack
        const jwtSecret =
            process.env.JWT_SECRET ||
            Secret.fromSecretNameV2(
                this,
                'JwtSecret',
                `mcr-cdk-api-jwt-secret-${this.stage}`
            )
                .secretValueFromJson('jwtsigningkey')
                .unsafeUnwrap()

        return {
            stage: this.stage,
            REGION: this.region,
            // Database URL set to AWS_SM to fetch connection from Secrets Manager at runtime
            DATABASE_URL: process.env.DATABASE_URL || 'AWS_SM',
            VITE_APP_AUTH_MODE: process.env.VITE_APP_AUTH_MODE || 'AWS_COGNITO',
            API_APP_OTEL_COLLECTOR_URL: otelCollectorUrl,
            SECRETS_MANAGER_SECRET: `aurora_postgres_${this.stage}`,
            EMAILER_MODE: emailerMode,
            PARAMETER_STORE_MODE: parameterStoreMode,
            APPLICATION_ENDPOINT: applicationEndpoint,
            AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
            OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
            LD_SDK_KEY: ldSdkKey,
            JWT_SECRET: jwtSecret,
            VITE_APP_S3_QA_BUCKET: qaUploadsBucketName,
            VITE_APP_S3_DOCUMENTS_BUCKET: documentUploadsBucketName,
            VITE_APP_S3_REGION: this.region,
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

        // OTEL endpoint with CORS support
        const otelResource = this.apiGateway.root.addResource('otel')
        new ApiEndpoint(this, 'otel', {
            resource: otelResource,
            method: 'POST',
            handler: this.otelFunction,
        })

        // OAuth token endpoint
        const oauthResource = apiGateway.root.addResource('oauth')
        const tokenResource = oauthResource.addResource('token')
        tokenResource.addMethod(
            'POST',
            new LambdaIntegration(this.oauthTokenFunction)
        )

        // GraphQL endpoints with IAM authorization and CORS
        const graphqlResource = this.apiGateway.root.addResource('graphql')
        new ApiEndpoint(this, 'graphql-post', {
            resource: graphqlResource,
            method: 'POST',
            handler: this.graphqlFunction,
            authorizationType: AuthorizationType.IAM,
        })
        new ApiEndpoint(this, 'graphql-get', {
            resource: graphqlResource,
            method: 'GET',
            handler: this.graphqlFunction,
            authorizationType: AuthorizationType.IAM,
        })

        // External GraphQL with custom authorizer
        const customAuthorizer = new RequestAuthorizer(
            this,
            'ThirdPartyApiAuthorizer',
            {
                handler: this.thirdPartyApiAuthorizerFunction,
                identitySources: ['method.request.header.Authorization'],
                authorizerName: `${ResourceNames.apiName('app-api', this.stage)}-third-party-authorizer`,
            }
        )

        const v1Resource = this.apiGateway.root.addResource('v1')
        const v1GraphqlResource = v1Resource.addResource('graphql')
        const externalResource = v1GraphqlResource.addResource('external')
        new ApiEndpoint(this, 'external-graphql-post', {
            resource: externalResource,
            method: 'POST',
            handler: this.graphqlFunction,
            authorizationType: AuthorizationType.CUSTOM,
            authorizer: customAuthorizer,
        })
        new ApiEndpoint(this, 'external-graphql-get', {
            resource: externalResource,
            method: 'GET',
            handler: this.graphqlFunction,
            authorizationType: AuthorizationType.CUSTOM,
            authorizer: customAuthorizer,
        })

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

    /**
     * Setup cleanup function cron schedule
     * Runs weekdays at 1 AM UTC to delete old RDS snapshots (>30 days)
     */
    private setupCleanupSchedule(): void {
        // Create CloudWatch Events rule with cron schedule
        const cleanupRule = new Rule(this, 'CleanupScheduleRule', {
            ruleName: `${ResourceNames.apiName('app-api', this.stage)}-cleanup-rule`,
            description:
                'Scheduled trigger for cleanup function to delete old RDS snapshots',
            schedule: Schedule.cron({
                minute: '0',
                hour: '1', // 1 AM UTC
                weekDay: 'MON-FRI', // Monday through Friday
            }),
        })

        // Add cleanup function as target
        cleanupRule.addTarget(new LambdaFunction(this.cleanupFunction))

        // Grant EventBridge permission to invoke the cleanup function
        // (This is handled automatically by the LambdaFunction target)
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

        new CfnOutput(this, 'MigrateFunctionName', {
            value: this.migrateFunction.functionName,
            exportName: this.exportName('MigrateFunctionName'),
            description: 'Database migrate Lambda function name',
        })

        new CfnOutput(this, 'GraphqlFunctionName', {
            value: this.graphqlFunction.functionName,
            exportName: this.exportName('GraphqlFunctionName'),
            description: 'GraphQL Lambda function name',
        })

        new CfnOutput(this, 'ApiGatewayUrl', {
            value: `https://${this.apiGateway.restApiId}.execute-api.${this.region}.amazonaws.com/${this.stage}`,
            exportName: this.exportName('ApiGatewayUrl'),
            description: 'App API Gateway URL',
        })
    }
}
