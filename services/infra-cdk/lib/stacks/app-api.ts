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
    TokenAuthorizer,
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
import { ResourceNames } from '../config/shared'
import {
    Architecture,
    Runtime,
    LayerVersion,
    type ILayerVersion,
} from 'aws-cdk-lib/aws-lambda'
import { CfnWebACL, CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2'
import { SubnetType, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2'
import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { ApiEndpoint } from '../constructs/api/api-endpoint'
import path from 'path'
import type { BundlingOptions } from 'aws-cdk-lib/aws-lambda-nodejs'

// AWS OTEL Lambda Layer ARN - update version here when needed
// Latest: v1.30.0 with OpenTelemetry JavaScript Core v1.30.0, AWS Lambda Instrumentation v0.50.3, ADOT Collector v0.43.0
const AWS_OTEL_LAYER_ARN =
    'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-30-0:1'

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

    // Shared OTEL layer for all functions
    private readonly otelLayer: ILayerVersion

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

        // Create OTEL layer for all functions (matches serverless provider-level default)
        this.otelLayer = LayerVersion.fromLayerVersionArn(
            this,
            'OtelLayer',
            AWS_OTEL_LAYER_ARN
        )

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
                layers: [this.otelLayer],
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
            role: lambdaRole,
            layers: [this.otelLayer],
            bundling: this.createBundling('otel', [
                this.getOtelBundlingCommands(),
            ]),
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
                layers: [this.otelLayer],
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
                layers: [this.otelLayer],
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
                layers: [this.otelLayer],
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
            `cp ${appApiPath}/collector.yml ${outputDir}/collector.yml || echo "collector.yml not found at ${appApiPath}/collector.yml"`,
            // Replace license key placeholder with actual value (matches esbuild behavior)
            `sed -i 's/\\$NR_LICENSE_KEY/${process.env.NR_LICENSE_KEY || ''}/g' "${outputDir}/collector.yml"`,
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
            `mkdir -p ${outputDir}/etaTemplates || true`,
            `cp -r ${appApiPath}/src/emailer/etaTemplates/* ${outputDir}/etaTemplates/ || echo "etaTemplates not found at ${appApiPath}/src/emailer/etaTemplates/"`,
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
                    const repoRoot =
                        '/home/runner/work/managed-care-review/managed-care-review'
                    const appApiPath = `${repoRoot}/services/app-api`

                    // Execute all bundling steps and flatten the results
                    return bundlingSteps.flatMap((step) =>
                        step(outputDir, appApiPath)
                    )
                },
            },
            ...(esbuildArgs && { esbuildArgs }),
        }
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
            bundling: this.createBundling(functionName, [
                this.getOtelBundlingCommands(),
            ]),
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
        // Validate required environment variables for VPC configuration
        const required = ['VPC_ID', 'SG_ID']
        const missing = required.filter((envVar) => !process.env[envVar])
        if (missing.length > 0) {
            throw new Error(
                `Missing required environment variables for migrate function: ${missing.join(', ')}`
            )
        }

        // Import VPC and security group from environment variables (matches serverless pattern)
        const vpc = Vpc.fromLookup(this, 'ImportedVpc', {
            vpcId: process.env.VPC_ID!,
        })

        const lambdaSecurityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            'ImportedSecurityGroup',
            process.env.SG_ID!
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
                CONNECT_TIMEOUT: '60',
            },
            role,
            layers: [this.otelLayer],
            vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [lambdaSecurityGroup],
            bundling: {
                ...this.createBundling(
                    'migrate',
                    [this.getOtelBundlingCommands()],
                    {
                        '--loader:.graphql': 'text',
                        '--loader:.gql': 'text',
                    }
                ),
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
        // Validate required environment variables for VPC configuration
        const required = ['VPC_ID', 'SG_ID']
        const missing = required.filter((envVar) => !process.env[envVar])
        if (missing.length > 0) {
            throw new Error(
                `Missing required environment variables for GraphQL function: ${missing.join(', ')}`
            )
        }

        // Import VPC and security group from environment variables (matches serverless pattern)
        const vpc = Vpc.fromLookup(this, 'GraphqlVpc', {
            vpcId: process.env.VPC_ID!,
        })

        const lambdaSecurityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            'GraphqlSecurityGroup',
            process.env.SG_ID!
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
            layers: [this.otelLayer],
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
