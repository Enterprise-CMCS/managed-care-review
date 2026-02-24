import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import { type Construct } from 'constructs'
import {
    NodejsFunction,
    type NodejsFunctionProps,
    OutputFormat,
} from 'aws-cdk-lib/aws-lambda-nodejs'
import {
    RestApi,
    type IRestApi,
    LambdaIntegration,
    TokenAuthorizer,
    AuthorizationType,
    ResponseType,
    MethodLoggingLevel,
    CfnAccount,
    LogGroupLogDestination,
    AccessLogFormat,
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
import { LogGroup } from 'aws-cdk-lib/aws-logs'
import { ResourceNames } from '../config/shared'
import {
    Architecture,
    Runtime,
    LayerVersion,
    type ILayerVersion,
    Code,
} from 'aws-cdk-lib/aws-lambda'
import { CfnWebACL, CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2'
import { SubnetType, Vpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2'
import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { AWS_OTEL_LAYER_ARN } from './lambda-layers'
import { ApiEndpoint } from '../constructs/api/api-endpoint'
import path from 'path'
import type { BundlingOptions } from 'aws-cdk-lib/aws-lambda-nodejs'
import type { IVpc, ISecurityGroup } from 'aws-cdk-lib/aws-ec2'

export interface AppApiStackProps extends BaseStackProps {
    // VPC imported from environment (Vpc.fromLookup), security groups from Network stack exports
}

/**
 * App API stack - GraphQL API with Lambda functions and dedicated API Gateway
 */
export class AppApiStack extends BaseStack {
    // ESM banner for Lambda bundling - provides CommonJS compatibility shims
    private static readonly ESM_BANNER =
        'import { createRequire } from "module";import { fileURLToPath } from "url";import { dirname } from "path";const require = createRequire(import.meta.url);const __filename = fileURLToPath(import.meta.url);const __dirname = dirname(__filename);'

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
    public readonly regenerateZipsFunction: NodejsFunction
    public readonly migrateS3UrlsFunction: NodejsFunction

    public readonly migrateProtobufDataFunction: NodejsFunction
    public readonly graphqlFunction: NodejsFunction

    // Shared Prisma migration layer for functions that need database migration
    private readonly prismaMigrationLayer: ILayerVersion
    // Shared OTEL layer for all functions
    private readonly otelLayer: ILayerVersion
    // Shared Prisma engine layer for GraphQL and OAuth functions
    private readonly prismaEngineLayer: ILayerVersion

    // Network resources from Network stack
    private readonly vpc: IVpc
    private readonly lambdaSecurityGroup: ISecurityGroup
    private readonly applicationSecurityGroup: ISecurityGroup

    constructor(scope: Construct, id: string, props: AppApiStackProps) {
        super(scope, id, {
            ...props,
            description:
                'App API - GraphQL Lambda functions and API Gateway integration',
        })

        // Import VPC from environment
        this.vpc = Vpc.fromLookup(this, 'ImportedVpc', {
            vpcId: process.env.VPC_ID!,
        })

        // Import security groups from Network stack CloudFormation exports
        const networkStackName = `network-${this.stage}-cdk`
        this.lambdaSecurityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            'ImportedLambdaSG',
            Fn.importValue(`${networkStackName}-LambdaSecurityGroupId`)
        )
        this.applicationSecurityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            'ImportedApplicationSG',
            Fn.importValue(`${networkStackName}-ApplicationSecurityGroupId`)
        )

        // Review environments skip CfnAccount (AWS::ApiGateway::Account) and CloudWatch
        // logging entirely. CfnAccount is an account/region-wide singleton — creating it
        // per review environment causes ResourceExistenceCheck failures on first-time stack
        // creation when the new IAM role doesn't exist yet. Dev/val/prod stacks own this
        // setting in their respective accounts and are unaffected.
        const isReview = this.stageConfig.environment === 'review'

        let apiGatewayLogGroup: LogGroup | undefined
        if (!isReview) {
            // Create CloudWatch Log Group for API Gateway access logs
            apiGatewayLogGroup = new LogGroup(this, 'ApiGatewayLogGroup', {
                logGroupName: `/aws/apigateway/${ResourceNames.apiName('app-api', this.stage)}-gateway`,
                retention: this.stageConfig.monitoring.logRetentionDays,
            })

            const apiGatewayCloudWatchRole = new Role(
                this,
                'ApiGatewayCloudWatchRole',
                {
                    assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
                    managedPolicies: [
                        ManagedPolicy.fromAwsManagedPolicyName(
                            'service-role/AmazonAPIGatewayPushToCloudWatchLogs' // pragma: allowlist secret
                        ),
                    ],
                }
            )

            new CfnAccount(this, 'ApiGatewayAccount', {
                cloudWatchRoleArn: apiGatewayCloudWatchRole.roleArn,
            })
        }

        // Create dedicated API Gateway for app-api
        this.apiGateway = new RestApi(this, 'AppApiGateway', {
            restApiName: `${ResourceNames.apiName('app-api', this.stage)}-gateway`,
            description: 'API Gateway for app-api Lambda functions',
            // Disable CDK's automatic CfnAccount creation — we manage it manually (above)
            cloudWatchRole: false,
            deployOptions: {
                stageName: this.stage,
                dataTraceEnabled: false,
                metricsEnabled: true,
                ...(!isReview && {
                    loggingLevel: MethodLoggingLevel.INFO,
                    accessLogDestination: new LogGroupLogDestination(
                        apiGatewayLogGroup!
                    ),
                    accessLogFormat: AccessLogFormat.jsonWithStandardFields({
                        caller: true,
                        httpMethod: true,
                        ip: true,
                        protocol: true,
                        requestTime: true,
                        resourcePath: true,
                        responseLength: true,
                        status: true,
                        user: true,
                    }),
                }),
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

        // Create OTEL layer for all functions (matches serverless provider-level default)
        this.otelLayer = LayerVersion.fromLayerVersionArn(
            this,
            'OtelLayer',
            AWS_OTEL_LAYER_ARN
        )

        // Create shared Prisma migration layer for functions that need database migration
        this.prismaMigrationLayer = new LayerVersion(
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

        // Create shared Prisma engine layer for functions that need database access
        this.prismaEngineLayer = new LayerVersion(this, 'PrismaEngineLayer', {
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

        // Populate common lambda parameters into variables to be used during function creation
        const securityGroups = [
            this.lambdaSecurityGroup,
            this.applicationSecurityGroup,
        ]
        const role = this.createLambdaRole()
        const environment = this.getLambdaEnvironment()

        // Create simple Lambda functions first (no VPC, layers, or complex dependencies)
        this.healthFunction = this.createLambdaFunction(
            'health',
            'health_check',
            'main',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                environment,
                role,
                layers: [this.otelLayer],
            }
        )

        this.emailSubmitFunction = this.createLambdaFunction(
            'email-submit',
            'email_submit',
            'main',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                environment,
                role,
                layers: [this.otelLayer],
            }
        )

        // OTEL function needs the ADOT layer and collector.yml file

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
            role,
            layers: [this.otelLayer],
            bundling: this.createBundling('otel', [
                this.getOtelBundlingCommands(),
            ]),
        })

        this.thirdPartyApiAuthorizerFunction = this.createLambdaFunction(
            'third-party-api-authorizer',
            'third_party_API_authorizer',
            'main',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                environment,
                role,
                layers: [this.otelLayer],
            }
        )

        // OAuth token function needs VPC and Prisma layer for database access
        this.oauthTokenFunction = this.createLambdaFunction(
            'oauth-token',
            'oauth_token',
            'main',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                environment,
                role,
                layers: [this.prismaEngineLayer, this.otelLayer],
                vpc: this.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups,
                bundling: {
                    format: OutputFormat.ESM,
                    banner: AppApiStack.ESM_BANNER,
                    externalModules: ['prisma', '@prisma/client'],
                    ...this.createBundling('oauth-token', [
                        this.getOtelBundlingCommands(),
                    ]),
                },
            }
        )

        this.cleanupFunction = this.createLambdaFunction(
            'cleanup',
            'cleanup',
            'main',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                environment,
                role,
                layers: [this.otelLayer],
            }
        )

        // Create the migrate protobuf function with VPC and layers
        this.migrateProtobufDataFunction = this.createLambdaFunction(
            'migrate-protobuf-data',
            'migrate_protobuf_data',
            'main',
            {
                timeout: Duration.minutes(5),
                memorySize: 512,
                environment: {
                    ...environment,
                    CONNECT_TIMEOUT: '60',
                    STAGE_NAME: this.stage,
                },
                role,
                layers: [this.prismaEngineLayer, this.otelLayer],
                vpc: this.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups,
                bundling: {
                    externalModules: ['prisma', '@prisma/client'],
                    ...this.createBundling('migrate-protobuf-data', [
                        this.getOtelBundlingCommands(),
                    ]),
                },
            }
        )

        // Create migrate function with VPC and layers
        this.migrateFunction = this.createLambdaFunction(
            'migrate',
            'postgres_migrate',
            'main',
            {
                timeout: Duration.seconds(60), // Extended timeout for DB operations
                memorySize: 1024,
                environment: {
                    ...environment,
                    SCHEMA_PATH: '/opt/nodejs/prisma/schema.prisma',
                    CONNECT_TIMEOUT: '60',
                    NODE_PATH: '/opt/nodejs/node_modules',
                },
                role,
                layers: [this.prismaMigrationLayer, this.otelLayer],
                vpc: this.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups,
                bundling: {
                    format: OutputFormat.ESM,
                    banner: AppApiStack.ESM_BANNER,
                    externalModules: ['prisma', '@prisma/client', '.prisma'],
                    ...this.createBundling(
                        'migrate',
                        [this.getOtelBundlingCommands()],
                        {
                            '--loader:.graphql': 'text',
                            '--loader:.gql': 'text',
                        }
                    ),
                },
            }
        )

        // Create regenerate zips function with VPC and layers
        this.regenerateZipsFunction = this.createLambdaFunction(
            'regenerateZips',
            'regenerate_zips',
            'main',
            {
                functionName: `${ResourceNames.apiName('app-api', this.stage)}-regenerate-zips`,
                timeout: Duration.minutes(15), // Extended timeout for processing many zips
                memorySize: 4096, // Higher memory for zip operations
                environment,
                role,
                layers: [this.prismaEngineLayer, this.otelLayer],
                vpc: this.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups,
                bundling: {
                    format: OutputFormat.ESM,
                    banner: AppApiStack.ESM_BANNER,
                    externalModules: ['prisma', '@prisma/client'],
                    ...this.createBundling('regenerate-zips', [
                        this.getOtelBundlingCommands(),
                    ]),
                },
            }
        )

        /**
         * Create the migrate S3 URLs function with VPC and Prisma engine layer
         * Used to migrate malformed s3URL fields to separate s3BucketName and s3Key columns
         */
        this.migrateS3UrlsFunction = this.createLambdaFunction(
            'migrateS3Urls',
            'migrate_s3_urls',
            'main',
            {
                timeout: Duration.minutes(15), // Extended timeout for processing many documents
                memorySize: 1024,
                environment,
                role,
                layers: [this.prismaEngineLayer, this.otelLayer],
                vpc: this.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups: [
                    this.lambdaSecurityGroup,
                    this.applicationSecurityGroup,
                ],
                bundling: {
                    format: OutputFormat.ESM,
                    banner: AppApiStack.ESM_BANNER,
                    externalModules: ['prisma', '@prisma/client'],
                    ...this.createBundling('migrate-s3-urls', [
                        this.getOtelBundlingCommands(),
                    ]),
                },
            }
        )

        // Create GraphQL function with VPC and layers
        this.graphqlFunction = this.createLambdaFunction(
            'graphql',
            'apollo_gql',
            'gqlHandler',
            {
                timeout: Duration.seconds(30), // Extended timeout for GraphQL operations
                memorySize: 1024,
                environment,
                role,
                layers: [this.prismaEngineLayer, this.otelLayer],
                vpc: this.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups,
                // Custom bundling to handle .graphql files and other assets
                bundling: {
                    format: OutputFormat.ESM,
                    banner: AppApiStack.ESM_BANNER,
                    minify: false,
                    sourceMap: true,
                    target: 'node20',
                    externalModules: ['prisma', '@prisma/client'],
                    ...this.createBundling(
                        'graphql',
                        [
                            this.getOtelBundlingCommands(),
                            this.getEtaTemplatesBundlingCommands(),
                        ],
                        {
                            '--loader:.graphql': 'text',
                            '--loader:.gql': 'text',
                        }
                    ),
                },
            }
        )

        // Create API Gateway resources and methods first
        this.setupApiGatewayRoutes(this.apiGateway)

        // Setup WAF association AFTER routes are configured (ensures deployment exists)
        this.setupWafAssociation(this.apiGateway)

        // Setup cleanup function cron schedule
        this.setupCleanupSchedule()

        this.createOutputs()
    }

    /**
     * Get OTEL-specific bundling commands (collector.yml copy and license key replacement)
     * Matches behavior from serverless esbuild configuration
     */
    private getOtelBundlingCommands(): (
        outputDir: string,
        appApiPath: string
    ) => string[] {
        return (outputDir: string, appApiPath: string) => [
            // Copy collector.yml for OTEL configuration
            `cp "${appApiPath}/collector.yml" "${outputDir}/collector.yml" || echo "collector.yml not found at ${appApiPath}/collector.yml"`,
            // Replace license key placeholder with actual value (matches esbuild behavior)
            // Use sed that works on both macOS and Linux
            `sed -i.bak 's/\\$NR_LICENSE_KEY/${process.env.NR_LICENSE_KEY || ''}/g' "${outputDir}/collector.yml" && rm -f "${outputDir}/collector.yml.bak"`,
        ]
    }

    /**
     * Get eta templates bundling commands for GraphQL function
     */
    private getEtaTemplatesBundlingCommands(): (
        outputDir: string,
        appApiPath: string
    ) => string[] {
        return (outputDir: string, appApiPath: string) => [
            // Copy eta templates for email functionality to correct location
            `mkdir -p "${outputDir}/etaTemplates" || true`,
            `cp -r "${appApiPath}/src/emailer/etaTemplates"/* "${outputDir}/etaTemplates/" || echo "etaTemplates not found at ${appApiPath}/src/emailer/etaTemplates/"`,
        ]
    }

    /**
     * Create generic bundling configuration that can compose different bundling steps
     */
    private createBundling(
        functionName: string,
        bundlingSteps: ((
            outputDir: string,
            appApiPath: string
        ) => string[])[] = [],
        esbuildArgs?: Record<string, string>
    ): BundlingOptions {
        return {
            format: OutputFormat.ESM,
            banner: AppApiStack.ESM_BANNER,
            commandHooks: {
                beforeBundling(inputDir: string, outputDir: string): string[] {
                    return [
                        `echo "CDK ${functionName} inputDir: ${inputDir}"`,
                        `find ${inputDir} -name "collector.yml" 2>/dev/null || true`,
                    ]
                },
                beforeInstall(): string[] {
                    return []
                },
                afterBundling(inputDir: string, outputDir: string): string[] {
                    // inputDir is the repo root (works in both CI and local)
                    const appApiPath = `${inputDir}/services/app-api`

                    // Execute all bundling steps and flatten the results
                    return bundlingSteps.flatMap((step) =>
                        step(outputDir, appApiPath)
                    )
                },
            },
            ...(esbuildArgs && { esbuildArgs }),
        }
    }

    private createLambdaFunction(
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
            bundling: this.createBundling(functionName, [
                this.getOtelBundlingCommands(),
            ]),
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

        // TEMPORARY: Grant access to old serverless buckets for legacy document access
        // TODO: Remove after database migration updates all s3URL references to new bucket
        const legacyDocumentsBucket = `arn:aws:s3:::uploads-${this.stage}-uploads-${this.account}`
        const legacyQABucket = `arn:aws:s3:::uploads-${this.stage}-qa-${this.account}`

        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:*'],
                resources: [
                    `${legacyDocumentsBucket}/allusers/*`,
                    `${legacyQABucket}/allusers/*`,
                    `${legacyDocumentsBucket}/zips/*`,
                ],
            })
        )

        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:ListBucket', 's3:GetBucketLocation'],
                resources: [legacyDocumentsBucket, legacyQABucket],
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
                    'rds:AddTagsToResource',
                ],
                resources: ['*'],
            })
        )

        return role
    }

    private getLambdaEnvironment(): Record<string, string> {
        // Get values from other stacks
        const uploadsStackName = ResourceNames.stackName('uploads', this.stage)
        const postgresStackName = ResourceNames.stackName(
            'postgres',
            this.stage
        )
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
            `${frontendStackName}-ApplicationUrl`
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

        const mcreviewOauthIssuer =
            process.env.MCREVIEW_OAUTH_ISSUER ||
            StringParameter.valueForStringParameter(
                this,
                '/configuration/mcreview_oauth_issuer'
            )

        // JWT Secret from Secrets Manager - reference secret created by postgres stack
        const jwtSecretName = Fn.importValue(
            `${postgresStackName}-JwtSecretName`
        )
        const jwtSecret =
            process.env.JWT_SECRET ||
            Secret.fromSecretNameV2(this, 'JwtSecret', jwtSecretName)
                .secretValueFromJson('jwtsigningkey')
                .unsafeUnwrap()

        return {
            stage: this.stage,
            REGION: this.region,
            // Database URL set to AWS_SM to fetch connection from Secrets Manager at runtime
            DATABASE_URL: process.env.DATABASE_URL || 'AWS_SM',
            VITE_APP_AUTH_MODE: process.env.VITE_APP_AUTH_MODE || 'AWS_COGNITO',
            API_APP_OTEL_COLLECTOR_URL: otelCollectorUrl,
            SECRETS_MANAGER_SECRET: Fn.importValue(
                `${postgresStackName}-PostgresSecretName`
            ),
            EMAILER_MODE: emailerMode,
            PARAMETER_STORE_MODE: parameterStoreMode,
            APPLICATION_ENDPOINT: applicationEndpoint,
            AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
            OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
            LD_SDK_KEY: ldSdkKey,
            JWT_SECRET: jwtSecret,
            MCREVIEW_OAUTH_ISSUER: mcreviewOauthIssuer,
            VITE_APP_S3_QA_BUCKET: qaUploadsBucketName,
            VITE_APP_S3_DOCUMENTS_BUCKET: documentUploadsBucketName,
            VITE_APP_S3_REGION: this.region,
            INTERNAL_ALLOWED_ORIGINS:
                process.env.INTERNAL_ALLOWED_ORIGINS || '',
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
        new ApiEndpoint(this, 'oauth-token-post', {
            resource: tokenResource,
            method: 'POST',
            handler: this.oauthTokenFunction,
            authorizationType: AuthorizationType.NONE,
        })

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
        const customAuthorizer = new TokenAuthorizer(
            this,
            'ThirdPartyApiAuthorizer',
            {
                handler: this.thirdPartyApiAuthorizerFunction,
                identitySource: 'method.request.header.Authorization',
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

        new CfnOutput(this, 'ProtobufMigrationFunctionName', {
            value: this.migrateProtobufDataFunction.functionName,
            exportName: this.exportName('MigrateProtobufDataFunctionName'),
            description: 'Protobuf data migration Lambda function name',
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

        new CfnOutput(this, 'RegenerateZipsFunctionName', {
            value: this.regenerateZipsFunction.functionName,
            exportName: this.exportName('RegenerateZipsFunctionName'),
            description: 'Regenerate zips Lambda function name',
        })

        new CfnOutput(this, 'MigrateS3UrlsFunctionName', {
            value: this.migrateS3UrlsFunction.functionName,
            exportName: this.exportName('MigrateS3UrlsFunctionName'),
            description: 'Migrate S3 URLs Lambda function name',
        })

        new CfnOutput(this, 'ApiGatewayUrl', {
            value: `https://${this.apiGateway.restApiId}.execute-api.${this.region}.amazonaws.com/${this.stage}`,
            exportName: this.exportName('ApiGatewayUrl'),
            description: 'App API Gateway URL',
        })
    }
}
