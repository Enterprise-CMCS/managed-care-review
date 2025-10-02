import { BaseStack, type BaseStackProps } from '../constructs/base'
import type { Construct } from 'constructs'
import {
    InterfaceVpcEndpoint,
    InterfaceVpcEndpointService,
    type IVpc,
    type ISecurityGroup,
    SubnetType,
} from 'aws-cdk-lib/aws-ec2'
import type { IDatabaseCluster } from 'aws-cdk-lib/aws-rds'
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam'
import { CfnOutput, Duration } from 'aws-cdk-lib'
import { AuroraServerlessV2 } from '../constructs/database'
import { isReviewEnvironment } from '../config/environments'
import * as path from 'path'

export interface PostgresProps extends BaseStackProps {
    vpc: IVpc
    lambdaSecurityGroup: ISecurityGroup
}

/**
 * Postgres stack that manages Aurora database and logical database operations
 * Creates parallel CDK-managed Aurora clusters separate from existing serverless deployment
 *
 * Testing phase: Creates Aurora clusters for all environments (including review)
 * Post-promotion: Review environments will use logical databases on shared CDK dev Aurora
 */
export class Postgres extends BaseStack {
    public readonly databaseSecret: ISecret
    public readonly jwtSecret: ISecret
    public readonly cluster?: IDatabaseCluster
    public readonly logicalDbManagerFunction: NodejsFunction
    public readonly vpcEndpoint: InterfaceVpcEndpoint

    constructor(scope: Construct, id: string, props: PostgresProps) {
        super(scope, id, {
            ...props,
            description:
                'Postgres stack for Managed Care Review - CDK Aurora database and logical DB management',
        })

        const isReview = isReviewEnvironment(this.stage)

        // Create VPC endpoint for Secrets Manager (needed by Lambda functions)
        this.vpcEndpoint = this.createSecretsManagerVpcEndpoint(props)

        // Create JWT secret for API authentication
        this.jwtSecret = this.createJwtSecret()

        if (!isReview) {
            // Create dedicated Aurora cluster for dev/val/prod
            const databaseName = `mcr_cdk_${this.stage}`

            const auroraCluster = new AuroraServerlessV2(this, 'Aurora', {
                databaseName,
                stage: this.stage,
                vpc: props.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroup: props.lambdaSecurityGroup,
                databaseConfig: this.stageConfig.database,
            })

            this.cluster = auroraCluster.cluster
            this.databaseSecret = auroraCluster.secret
        } else {
            // Review environments use shared CDK dev Aurora via logical databases
            // The logicalDbManagerFunction will create a logical database for this review environment
            this.databaseSecret = this.createOrReferenceCdkDevSecret()
        }

        // Create the logical database manager Lambda
        this.logicalDbManagerFunction = this.createLogicalDbManagerLambda(props)

        // Create outputs
        this.createOutputs()
    }

    /**
     * Create VPC endpoint for Secrets Manager (required by Lambda functions)
     */
    private createSecretsManagerVpcEndpoint(
        props: PostgresProps
    ): InterfaceVpcEndpoint {
        return new InterfaceVpcEndpoint(this, 'SecretsManagerVPCEndpoint', {
            vpc: props.vpc,
            service: new InterfaceVpcEndpointService(
                `com.amazonaws.${this.region}.secretsmanager`
            ),
            subnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [props.lambdaSecurityGroup],
        })
    }

    /**
     * Create JWT secret for API authentication
     */
    private createJwtSecret(): ISecret {
        return new Secret(this, 'JwtSecret', {
            secretName: `api-jwt-secret-${this.stage}-cdk`,
            description: 'JWT secret for API authentication',
            generateSecretString: {
                secretStringTemplate: '{}',
                generateStringKey: 'jwtsigningkey',
                passwordLength: 64,
                excludeCharacters: '"@/\\',
            },
        })
    }

    /**
     * Reference CDK dev Aurora secret for review environments
     * Review environments use logical databases in the shared dev Aurora cluster
     */
    private createOrReferenceCdkDevSecret(): ISecret {
        // Reference the dev database secret by its known name
        // This secret is created by the postgres-dev-cdk stack (deployed via promote-cdk.yml)
        const devSecretName = 'aurora-postgres-dev-cdk'

        return Secret.fromSecretNameV2(this, 'DevDatabaseSecret', devSecretName)
    }

    /**
     * Create logical database manager Lambda function
     */
    private createLogicalDbManagerLambda(props: PostgresProps): NodejsFunction {
        // Use NodejsFunction to bundle the TypeScript code from postgres service
        const dbManagerFunction = new NodejsFunction(
            this,
            'LogicalDatabaseManager',
            {
                functionName: `postgres-${this.stage}-dbManager-cdk`,
                description:
                    'Manages logical databases in the CDK PostgreSQL Aurora cluster',
                runtime: Runtime.NODEJS_20_X,
                architecture: Architecture.X86_64,
                handler: 'handler',
                entry: path.join(
                    __dirname,
                    '..',
                    '..',
                    '..',
                    'postgres',
                    'src',
                    'logicalDatabaseManager.ts'
                ),
                timeout: Duration.seconds(60),
                memorySize: this.stageConfig.lambda.memorySize,
                vpc: props.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups: [props.lambdaSecurityGroup],
                environment: {
                    SECRETS_MANAGER_ENDPOINT: `https://secretsmanager.${this.region}.amazonaws.com`,
                    DB_SECRET_ARN: this.databaseSecret.secretArn,
                    ...(this.cluster && {
                        DB_CLUSTER_ARN: this.cluster.clusterArn,
                    }),
                },
            }
        )

        // Grant permissions
        this.databaseSecret.grantRead(dbManagerFunction)

        if (this.cluster && this.stageConfig.database.enableDataApi) {
            this.cluster.grantDataApiAccess(dbManagerFunction)
        }

        // Grant secret management permissions for creating review environment secrets
        dbManagerFunction.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'secretsmanager:CreateSecret',
                    'secretsmanager:UpdateSecret',
                    'secretsmanager:DeleteSecret',
                    'secretsmanager:GetRandomPassword',
                ],
                resources: ['*'],
            })
        )

        return dbManagerFunction
    }

    /**
     * Create stack outputs that match serverless outputs
     */
    private createOutputs(): void {
        const isReview = isReviewEnvironment(this.stage)

        // For review environments, output the logical database secret name (created by Lambda)
        // For dev/val/prod, output the actual Aurora secret
        const secretName = isReview
            ? `aurora-postgres-${this.stage}-cdk`
            : this.databaseSecret.secretName

        // Note: For review environments, the ARN won't be resolvable until the Lambda creates it
        // but we can construct it predictably
        const secretArn = isReview
            ? `arn:aws:secretsmanager:${this.region}:${this.account}:secret:aurora-postgres-${this.stage}-cdk-??????`
            : this.databaseSecret.secretArn

        new CfnOutput(this, 'PostgresSecretArn', {
            value: secretArn,
            description: isReview
                ? 'CDK PostgreSQL logical database secret ARN (created by logicalDbManagerFunction)'
                : 'CDK PostgreSQL database secret ARN',
            exportName: this.exportName('PostgresSecretArn'),
        })

        new CfnOutput(this, 'PostgresSecretName', {
            value: secretName,
            description: isReview
                ? 'CDK PostgreSQL logical database secret name (created by logicalDbManagerFunction)'
                : 'CDK PostgreSQL database secret name',
            exportName: this.exportName('PostgresSecretName'),
        })

        new CfnOutput(this, 'JwtSecretArn', {
            value: this.jwtSecret.secretArn,
            description: 'JWT secret ARN for API authentication',
            exportName: this.exportName('JwtSecretArn'),
        })

        new CfnOutput(this, 'JwtSecretName', {
            value: this.jwtSecret.secretName,
            description: 'JWT secret name for API authentication',
            exportName: this.exportName('JwtSecretName'),
        })

        if (this.cluster) {
            new CfnOutput(this, 'PostgresAuroraV2Arn', {
                value: this.cluster.clusterArn,
                description: 'CDK PostgreSQL Aurora cluster ARN',
                exportName: this.exportName('PostgresAuroraV2Arn'),
            })

            new CfnOutput(this, 'PostgresClusterEndpoint', {
                value: this.cluster.clusterEndpoint.hostname,
                description: 'CDK PostgreSQL Aurora cluster endpoint',
                exportName: this.exportName('PostgresClusterEndpoint'),
            })
        }

        new CfnOutput(this, 'LogicalDbManagerFunctionArn', {
            value: this.logicalDbManagerFunction.functionArn,
            description: 'Logical database manager Lambda function ARN',
            exportName: this.exportName('LogicalDbManagerFunctionArn'),
        })

        new CfnOutput(this, 'LogicalDbManagerFunctionName', {
            value: this.logicalDbManagerFunction.functionName,
            description: 'Logical database manager Lambda function name',
            exportName: this.exportName('LogicalDbManagerFunctionName'),
        })

        new CfnOutput(this, 'VpcEndpointId', {
            value: this.vpcEndpoint.vpcEndpointId,
            description: 'Secrets Manager VPC endpoint ID',
            exportName: this.exportName('VpcEndpointId'),
        })
    }
}
