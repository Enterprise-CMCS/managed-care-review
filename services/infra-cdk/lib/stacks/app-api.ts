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
import { isReviewEnvironment } from '../config/environments'
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda'
import { CfnWebACL, CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2'
import { SubnetType, Vpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2'
import { Match, Rule, Schedule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { Trigger, InvocationType } from 'aws-cdk-lib/triggers'
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
        'import { createRequire as __createRequire } from "module";import { fileURLToPath as __fileURLToPath } from "url";import { dirname as __dirnameFn } from "path";const require = __createRequire(import.meta.url);const __filename = __fileURLToPath(import.meta.url);const __dirname = __dirnameFn(__filename);'

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
    public readonly backfillLastActionDateFunction: NodejsFunction
    public readonly restoreIAToStandardFunction: NodejsFunction

    public readonly graphqlFunction: NodejsFunction

    // Network resources from Network stack
    private readonly vpc: IVpc
    private readonly applicationSecurityGroup: ISecurityGroup
    private readonly devSecurityGroup?: ISecurityGroup

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

        // Review environments skip CfnAccount (AWS::ApiGateway::Account) and CloudWatch
        // logging entirely. CfnAccount is an account/region-wide singleton — creating it
        // per review environment causes ResourceExistenceCheck failures on first-time stack
        // creation when the new IAM role doesn't exist yet. Dev/val/prod stacks own this
        // setting in their respective accounts and are unaffected.
        const isReview = isReviewEnvironment(this.stage)

        // Import security group from Network stack CloudFormation exports
        const networkStackName = ResourceNames.stackName('network', this.stage)
        this.applicationSecurityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            'ImportedApplicationSG',
            Fn.importValue(`${networkStackName}-ApplicationSecurityGroupId`)
        )

        // Review environments need DEV security group to access shared DEV Aurora database
        if (isReview) {
            this.devSecurityGroup = SecurityGroup.fromSecurityGroupId(
                this,
                'ImportedDevSG',
                Fn.importValue(
                    `${ResourceNames.stackName('network', 'dev')}-ApplicationSecurityGroupId`
                )
            )
        }

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
            binaryMediaTypes: ['application/x-protobuf'],
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
                    'traceparent',
                    'tracestate',
                ],
            },
        })

        // Add Gateway Responses to ensure CORS headers are included in error responses
        this.apiGateway.addGatewayResponse('Default4xx', {
            type: ResponseType.DEFAULT_4XX,
            responseHeaders: {
                'Access-Control-Allow-Origin': "'*'",
                'Access-Control-Allow-Headers':
                    "'Content-Type,Authorization,x-amzn-trace-id,x-amzn-requestid,x-amz-date,x-api-key,x-amz-security-token,traceparent,tracestate'",
                'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
            },
        })

        this.apiGateway.addGatewayResponse('Default5xx', {
            type: ResponseType.DEFAULT_5XX,
            responseHeaders: {
                'Access-Control-Allow-Origin': "'*'",
                'Access-Control-Allow-Headers':
                    "'Content-Type,Authorization,x-amzn-trace-id,x-amzn-requestid,x-amz-date,x-api-key,x-amz-security-token,traceparent,tracestate'",
                'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
            },
        })

        this.apiGateway.addGatewayResponse('Unauthorized', {
            type: ResponseType.UNAUTHORIZED,
            responseHeaders: {
                'Access-Control-Allow-Origin': "'*'",
                'Access-Control-Allow-Headers':
                    "'Content-Type,Authorization,x-amzn-trace-id,x-amzn-requestid,x-amz-date,x-api-key,x-amz-security-token,traceparent,tracestate'",
                'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
            },
        })

        this.apiGateway.addGatewayResponse('AccessDenied', {
            type: ResponseType.ACCESS_DENIED,
            responseHeaders: {
                'Access-Control-Allow-Origin': "'*'",
                'Access-Control-Allow-Headers':
                    "'Content-Type,Authorization,x-amzn-trace-id,x-amzn-requestid,x-amz-date,x-api-key,x-amz-security-token,traceparent,tracestate'",
                'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
            },
        })

        // Populate common lambda parameters into variables to be used during function creation
        const securityGroups = this.getLambdaSecurityGroups()
        const role = this.createLambdaRole()
        const environment = this.getLambdaEnvironment()

        // Create simple Lambda functions first (no VPC or complex dependencies)
        this.healthFunction = this.createLambdaFunction(
            'health',
            'health_check',
            'main',
            {
                timeout: Duration.seconds(30),
                memorySize: 1024,
                environment,
                role,
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
            }
        )

        this.otelFunction = new NodejsFunction(this, 'otelFunction', {
            functionName: `${ResourceNames.apiName('app-api', this.stage)}-otel`,
            runtime: Runtime.NODEJS_24_X,
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
                vpc: this.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups,
                bundling: {
                    format: OutputFormat.ESM,
                    banner: AppApiStack.ESM_BANNER,
                    ...this.createBundling('oauth-token', [
                        this.getPrismaCleanupCommands(),
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
            }
        )

        /**
         * Create migrate function with special Prisma CLI handling
         *
         * TWO-TIER PRISMA BUNDLING STRATEGY:
         *
         * 1. Runtime functions (GraphQL, OAuth, etc.):
         *    - Import Prisma Client as code: `import { PrismaClient } from '../generated/client'`
         *    - esbuild bundles @prisma/client into handler code (~1.6 MB with WASM)
         *    - No node_modules needed ✅
         *
         * 2. Migrate function (this one):
         *    - Spawns Prisma CLI: `spawnSync(node, ['./node_modules/prisma/build/index.js', 'migrate', 'deploy'])`
         *    - Needs actual `prisma` package at node_modules/prisma/build/index.js
         *    - Uses nodeModules: ['prisma'] to copy CLI package instead of bundling it
         *    - Prisma 7 CLI is ~5-8 MB (much smaller than v5's ~40 MB with Rust binaries) ✅
         *
         * Size implications:
         * - Other functions: ~8-12 MB (bundled Prisma Client + app code)
         * - Migrate function: ~10-15 MB (bundled handler + prisma CLI in node_modules + schema/migrations)
         * - Well within Lambda limits (250 MB unzipped, 50 MB zipped)
         */
        this.migrateFunction = this.createLambdaFunction(
            'migrate',
            'postgres_migrate',
            'main',
            {
                timeout: Duration.seconds(60), // Extended timeout for DB operations
                memorySize: 1024,
                environment: {
                    ...environment,
                    CONNECT_TIMEOUT: '60',
                },
                role,
                vpc: this.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups,
                bundling: {
                    format: OutputFormat.ESM,
                    banner: AppApiStack.ESM_BANNER,
                    // CDK stages a synthetic package for nodeModules installs with an empty
                    // pnpm-workspace.yaml, so pnpm cannot see the repo's allowBuilds config.
                    // This bundling install only contains prisma and its transitive deps.
                    environment: {
                        PNPM_CONFIG_DANGEROUSLY_ALLOW_ALL_BUILDS: 'true',
                    },
                    // CRITICAL: Keep prisma CLI as node module (not bundled) so it can be executed via spawnSync
                    nodeModules: ['prisma'],
                    ...this.createBundling(
                        'migrate',
                        [
                            this.getPrismaSchemaAndMigrationsBundlingCommands(),
                            this.getPrismaCleanupCommands(),
                        ],
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
                vpc: this.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups,
                bundling: {
                    format: OutputFormat.ESM,
                    banner: AppApiStack.ESM_BANNER,
                    ...this.createBundling('regenerate-zips', [
                        this.getPrismaCleanupCommands(),
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
                vpc: this.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups,
                bundling: {
                    format: OutputFormat.ESM,
                    banner: AppApiStack.ESM_BANNER,
                    ...this.createBundling('migrate-s3-urls', [
                        this.getPrismaCleanupCommands(),
                    ]),
                },
            }
        )

        /**
         * This is a migration to backfill lastActionDate for existing
         * contract/rate rows after adding ContractTable.lastActionDate and
         * RateTable.lastActionDate.
         */
        this.backfillLastActionDateFunction = this.createLambdaFunction(
            'backfill-last-action-date',
            'backfill_last_action_date',
            'main',
            {
                timeout: Duration.minutes(15),
                memorySize: 2048,
                environment,
                role,
                vpc: this.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups,
                bundling: {
                    format: OutputFormat.ESM,
                    banner: AppApiStack.ESM_BANNER,
                    ...this.createBundling('backfill-last-action-date', [
                        this.getPrismaCleanupCommands(),
                    ]),
                },
            }
        )

        /**
         * Create the restore IA to Standard function with dedicated role
         * Restores Infrequent Access files to S3 Standard storage
         * NOTE: Cannot handle Glacier files - use AWS S3 Batch Operations for those
         */
        const restoreIAToStandardRole = new Role(
            this,
            'RestoreIAToStandardRole',
            {
                assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
                managedPolicies: [
                    ManagedPolicy.fromAwsManagedPolicyName(
                        'service-role/AWSLambdaBasicExecutionRole'
                    ),
                ],
            }
        )

        // Grant S3 permissions (scoped to specific buckets)
        restoreIAToStandardRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:ListBucket'],
                resources: [
                    `arn:aws:s3:::${environment.VITE_APP_S3_DOCUMENTS_BUCKET}`,
                    `arn:aws:s3:::${environment.VITE_APP_S3_QA_BUCKET}`,
                ],
            })
        )

        restoreIAToStandardRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    's3:GetObject',
                    's3:PutObject',
                    's3:GetObjectAttributes',
                    's3:GetObjectTagging',
                    's3:PutObjectTagging',
                ],
                resources: [
                    `arn:aws:s3:::${environment.VITE_APP_S3_DOCUMENTS_BUCKET}/*`,
                    `arn:aws:s3:::${environment.VITE_APP_S3_QA_BUCKET}/*`,
                ],
            })
        )

        this.restoreIAToStandardFunction = this.createLambdaFunction(
            'restore-ia-to-standard',
            'restore_ia_to_standard',
            'main',
            {
                timeout: Duration.minutes(15), // Extended timeout for processing many files
                memorySize: 1024,
                environment,
                role: restoreIAToStandardRole,
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
                    target: 'node24',
                    ...this.createBundling(
                        'graphql',
                        [
                            this.getEtaTemplatesBundlingCommands(),
                            this.getPrismaCleanupCommands(),
                        ],
                        {
                            '--loader:.graphql': 'text',
                            '--loader:.gql': 'text',
                        }
                    ),
                },
            }
        )

        // Run database migrations as part of the deploy, ordered so the schema is
        // always migrated before the GraphQL Lambda swaps onto new code.
        //
        // CloudFormation serializes this as: update migrate Lambda -> invoke it
        // (this Trigger) -> update graphqlFunction. That closes the window where
        // newly-deployed GraphQL code could query a table/column a migration has
        // not created yet (e.g. ContractRevisionOverrides). REQUEST_RESPONSE makes
        // the invocation synchronous so a failed migration (the handler throws)
        // fails the change set and rolls the GraphQL code update back, rather than
        // leaving new code running against an un-migrated schema.
        //
        // The Trigger re-fires whenever the migrate Lambda's bundle changes; a new
        // migration changes the bundled prisma/migrations, so it runs exactly when
        // there is something to apply (and always on stack creation).
        new Trigger(this, 'RunMigrations', {
            handler: this.migrateFunction,
            invocationType: InvocationType.REQUEST_RESPONSE,
            // Upper bound on how long CloudFormation waits for the invocation.
            // This does not extend the migrate Lambda's own 60s function
            // timeout, which is the real cap on migration time; the headroom
            // covers the trigger provider's invoke overhead and retries.
            timeout: Duration.minutes(2),
            executeAfter: [this.migrateFunction],
            executeBefore: [this.graphqlFunction],
        })

        // Create API Gateway resources and methods first
        this.setupApiGatewayRoutes(this.apiGateway)

        // Setup WAF association AFTER routes are configured (ensures deployment exists)
        this.setupWafAssociation(this.apiGateway)

        // Setup cleanup function cron schedule
        this.setupCleanupSchedule()

        // Force cold-start on all DB-connected Lambdas after secret rotation
        this.setupRotationNotifier()

        this.createOutputs()
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
     * Cleanup unnecessary Prisma WASM engines
     * Prisma 7 includes WASM for all databases (~60MB), we only need PostgreSQL (~5MB)
     *
     * This cleanup applies to:
     * - Bundled Prisma Client code (GraphQL, OAuth, etc.)
     * - node_modules/prisma for migrate lambda
     */
    private getPrismaCleanupCommands(): (
        outputDir: string,
        appApiPath: string
    ) => string[] {
        return (outputDir: string, _appApiPath: string) => [
            // Remove WASM files for databases we don't use (MySQL, SQLite, SQL Server, CockroachDB)
            // Keep only PostgreSQL WASM files
            // This searches both bundled code and node_modules
            `find "${outputDir}" -type f \\( -name "*mysql*.wasm*" -o -name "*sqlite*.wasm*" -o -name "*sqlserver*.wasm*" -o -name "*cockroachdb*.wasm*" \\) -delete || true`,
            `echo "Cleaned up non-PostgreSQL WASM engines from ${outputDir}"`,
            // Log the size of node_modules if it exists (for migrate lambda)
            `if [ -d "${outputDir}/node_modules" ]; then du -sh "${outputDir}/node_modules" | sed 's/^/node_modules size: /'; fi || true`,
        ]
    }

    /**
     * Get Prisma schema and migrations bundling commands for migrate function
     *
     * Copies the repo's prisma.config.ts and recreates the directory structure it expects.
     * Only includes schema migrations - protobuf data migrations have been removed.
     */
    private getPrismaSchemaAndMigrationsBundlingCommands(): (
        outputDir: string,
        appApiPath: string
    ) => string[] {
        return (outputDir: string, appApiPath: string) => [
            // Validate required files exist before copying
            `test -f "${appApiPath}/../../prisma.config.ts" || { echo "ERROR: prisma.config.ts not found"; exit 1; }`,
            `test -f "${appApiPath}/prisma/schema.prisma" || { echo "ERROR: schema.prisma not found"; exit 1; }`,
            `test -d "${appApiPath}/prisma/migrations" || { echo "ERROR: migrations directory not found"; exit 1; }`,

            // Create directory structure
            `mkdir -p "${outputDir}/services/app-api/prisma"`,

            // Copy Prisma config from repo root
            `cp "${appApiPath}/../../prisma.config.ts" "${outputDir}/prisma.config.ts"`,

            // Copy schema and migrations to match config's expected paths
            `cp "${appApiPath}/prisma/schema.prisma" "${outputDir}/services/app-api/prisma/schema.prisma"`,
            `cp -r "${appApiPath}/prisma/migrations" "${outputDir}/services/app-api/prisma/migrations"`,

            `echo "Successfully copied Prisma config, schema, and migrations"`,
        ]
    }

    /**
     * Create generic bundling configuration that can compose different bundling steps
     *
     * Prisma 7 Note: No special handling needed. esbuild bundles Prisma packages naturally
     * because the WASM engines are now JavaScript modules, not external binaries.
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
            // Let esbuild bundle everything including Prisma
            // Prisma 7 WASM engines (~1.6 MB) are bundled automatically
            // AWS SDK v3 is included in Node.js 20+ Lambda runtimes
            commandHooks: {
                beforeBundling(inputDir: string, outputDir: string): string[] {
                    return [
                        `echo "CDK bundling ${functionName} - inputDir: ${inputDir}"`,
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
            runtime: Runtime.NODEJS_24_X,
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
            bundling: this.createBundling(functionName),
            ...options,
        })
    }

    /**
     * Returns the security groups for VPC-connected Lambda functions.
     * Review environments include the DEV SG to access the shared DEV Aurora cluster.
     */
    private getLambdaSecurityGroups(): ISecurityGroup[] {
        const sgs: ISecurityGroup[] = [this.applicationSecurityGroup]
        if (this.devSecurityGroup) sgs.push(this.devSecurityGroup)
        return sgs
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

        const oktaOauthIssuer =
            process.env.OKTA_OAUTH_ISSUER ||
            StringParameter.valueForStringParameter(
                this,
                '/configuration/okta_oauth_issuer'
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
            SECRETS_MANAGER_SECRET: Fn.importValue(
                `${postgresStackName}-PostgresSecretName`
            ),
            EMAILER_MODE: emailerMode,
            PARAMETER_STORE_MODE: parameterStoreMode,
            APPLICATION_ENDPOINT: applicationEndpoint,

            DD_API_KEY: (() => {
                if (!process.env.DD_API_KEY)
                    throw new Error('DD_API_KEY is required')
                return process.env.DD_API_KEY
            })(),
            LD_SDK_KEY: ldSdkKey,
            JWT_SECRET: jwtSecret,
            MCREVIEW_OAUTH_ISSUER: mcreviewOauthIssuer,
            OKTA_OAUTH_ISSUER: oktaOauthIssuer,
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

    /**
     * Create a Lambda + EventBridge rule that bumps ROTATION_TIMESTAMP on all
     * DB-connected VPC Lambdas whenever the Aurora secret rotation succeeds,
     * ensuring no warmed instance retains a stale database password.
     */
    private setupRotationNotifier(): void {
        const dbConnectedFunctions = [
            this.oauthTokenFunction,
            this.migrateFunction,
            this.regenerateZipsFunction,
            this.migrateS3UrlsFunction,
            this.backfillLastActionDateFunction,
            this.graphqlFunction,
        ]

        const postgresStackName = ResourceNames.stackName(
            'postgres',
            this.stage
        )
        const logicalDbManagerFunctionName = Fn.importValue(
            `${postgresStackName}-LogicalDbManagerFunctionName`
        )
        const logicalDbManagerFunctionArn = Fn.importValue(
            `${postgresStackName}-LogicalDbManagerFunctionArn`
        )
        const dbSecretName = Fn.importValue(
            `${postgresStackName}-PostgresSecretName`
        )

        const allFunctionNames = [
            ...dbConnectedFunctions.map((fn) => fn.functionName),
            logicalDbManagerFunctionName,
        ]

        const notifier = this.createLambdaFunction(
            'rotation-notifier',
            'rotation_notifier',
            'main',
            {
                timeout: Duration.seconds(60),
                environment: {
                    LAMBDA_FUNCTION_NAMES: allFunctionNames.join(','),
                    DB_SECRET_NAME: dbSecretName,
                },
            }
        )

        // Grant permission to read and update each target function's configuration
        dbConnectedFunctions.forEach((fn) => {
            notifier.addToRolePolicy(
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        'lambda:GetFunctionConfiguration',
                        'lambda:UpdateFunctionConfiguration',
                    ],
                    resources: [fn.functionArn],
                })
            )
        })

        notifier.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'lambda:GetFunctionConfiguration',
                    'lambda:UpdateFunctionConfiguration',
                ],
                resources: [logicalDbManagerFunctionArn],
            })
        )

        // Fire whenever Secrets Manager reports a successful rotation
        new Rule(this, 'SecretRotationSucceededRule', {
            eventPattern: {
                source: ['aws.secretsmanager'],
                detailType: ['AWS Service Event via CloudTrail'],
                detail: {
                    eventSource: ['secretsmanager.amazonaws.com'],
                    eventName: ['RotationSucceeded'],
                    additionalEventData: {
                        SecretId: Match.wildcard(`*${dbSecretName}*`),
                    },
                },
            },
            targets: [new LambdaFunction(notifier)],
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

        new CfnOutput(this, 'BackfillLastActionDateFunctionName', {
            value: this.backfillLastActionDateFunction.functionName,
            exportName: this.exportName('BackfillLastActionDateFunctionName'),
            description: 'Backfill lastActionDate Lambda function name',
        })

        new CfnOutput(this, 'ApiGatewayUrl', {
            value: `https://${this.apiGateway.restApiId}.execute-api.${this.region}.amazonaws.com/${this.stage}`,
            exportName: this.exportName('ApiGatewayUrl'),
            description: 'App API Gateway URL',
        })
    }
}
