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
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda'
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam'
import { CfnOutput, Duration } from 'aws-cdk-lib'
import { AuroraServerlessV2 } from '../constructs/database'
import { isReviewEnvironment } from '../config/environments'

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
    public readonly cluster?: IDatabaseCluster
    public readonly logicalDbManagerFunction: Function
    public readonly vpcEndpoint: InterfaceVpcEndpoint

    constructor(scope: Construct, id: string, props: PostgresProps) {
        super(scope, id, {
            ...props,
            description:
                'Postgres stack for Managed Care Review - CDK Aurora database and logical DB management',
        })

        const isReview = isReviewEnvironment(this.stage)
        const isTestingBranch = this.stage === 'mtcdkoidc' //TODO: remove. temp deploy postgres in this branch

        // Create VPC endpoint for Secrets Manager (needed by Lambda functions)
        this.vpcEndpoint = this.createSecretsManagerVpcEndpoint(props)

        if (!isReview || isTestingBranch) {
            // Create dedicated Aurora cluster for:
            // - dev/val/prod (always)
            // - review environments during testing phase (temporary)
            const databaseName = isReview
                ? `mcr_cdk_review_${this.stage}`
                : `mcr_cdk_${this.stage}`

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
            // Future: Review environments use shared CDK dev Aurora via logical databases
            // This will be enabled after promotion creates the CDK dev Aurora cluster
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
            privateDnsEnabled: true,
        })
    }

    /**
     * Create or reference CDK dev secret for review environments
     * TODO: Implement after CDK dev Aurora is promoted
     */
    private createOrReferenceCdkDevSecret(): ISecret {
        // For now, throw an error - this will be implemented post-promotion
        throw new Error(
            'Review environments using shared CDK dev Aurora not yet implemented. ' +
                'This will be enabled after CDK postgres stack is promoted to dev.'
        )
    }

    /**
     * Create logical database manager Lambda function
     */
    private createLogicalDbManagerLambda(props: PostgresProps): Function {
        // Simple Lambda function - no complex factory needed
        const dbManagerFunction = new Function(this, 'LogicalDatabaseManager', {
            functionName: `postgres-${this.stage}-dbManager-cdk`,
            description:
                'Manages logical databases in the CDK PostgreSQL Aurora cluster',
            runtime: Runtime.NODEJS_20_X,
            handler: 'logicalDatabaseManager.handler',
            code: Code.fromAsset('src/lambdas/postgres'),
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
        })

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
        new CfnOutput(this, 'PostgresSecretArn', {
            value: this.databaseSecret.secretArn,
            description: 'CDK PostgreSQL database secret ARN',
            exportName: `MCR-Postgres-${this.stage}-SecretArn-cdk`,
        })

        if (this.cluster) {
            new CfnOutput(this, 'PostgresAuroraV2Arn', {
                value: this.cluster.clusterArn,
                description: 'CDK PostgreSQL Aurora cluster ARN',
                exportName: `MCR-Postgres-${this.stage}-cdk-PostgresAuroraV2Arn`,
            })

            new CfnOutput(this, 'PostgresClusterEndpoint', {
                value: this.cluster.clusterEndpoint.hostname,
                description: 'CDK PostgreSQL Aurora cluster endpoint',
                exportName: `MCR-Postgres-${this.stage}-ClusterEndpoint-cdk`,
            })
        }

        new CfnOutput(this, 'LogicalDbManagerFunctionArn', {
            value: this.logicalDbManagerFunction.functionArn,
            description: 'Logical database manager Lambda function ARN',
            exportName: `MCR-Postgres-${this.stage}-LogicalDbManager-cdk`,
        })

        new CfnOutput(this, 'VpcEndpointId', {
            value: this.vpcEndpoint.vpcEndpointId,
            description: 'Secrets Manager VPC endpoint ID',
            exportName: `MCR-Postgres-${this.stage}-VpcEndpoint-cdk`,
        })
    }
}
