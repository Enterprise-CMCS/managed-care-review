import { BaseStack, type BaseStackProps } from '../constructs/base'
import type { Construct } from 'constructs'
import {
    InterfaceVpcEndpoint,
    InterfaceVpcEndpointService,
    type IVpc,
    type ISecurityGroup,
    SubnetType,
    Instance,
    InstanceType,
    InstanceClass,
    InstanceSize,
    MachineImage,
    UserData,
    AmazonLinuxCpuType,
    BlockDeviceVolume,
    EbsDeviceVolumeType,
} from 'aws-cdk-lib/aws-ec2'
import type { IDatabaseCluster } from 'aws-cdk-lib/aws-rds'
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import {
    PolicyStatement,
    Effect,
    Role,
    ServicePrincipal,
    ManagedPolicy,
} from 'aws-cdk-lib/aws-iam'
import { CfnOutput, Duration, Fn, Tags } from 'aws-cdk-lib'
import { AuroraServerlessV2 } from '../constructs/database'
import { isReviewEnvironment } from '../config/environments'
import { join } from 'path'

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
    public readonly bastionHost?: Instance

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
            // PostgreSQL logical database name - matches naming pattern
            const databaseName = `postgres_${this.stage}_cdk`

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

            // Create optional bastion host for database access
            if (this.stageConfig.features.enablePostgresVm) {
                this.bastionHost = this.createBastionHost(props)
            }
        } else {
            // Review environments use shared CDK dev Aurora via logical databases
            // Create a placeholder secret that the logicalDbManagerFunction will update with actual credentials
            this.databaseSecret = this.createReviewEnvironmentSecret()
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
     * Create placeholder secret for review environments
     * The logicalDbManagerFunction will update this secret with actual logical database credentials
     */
    private createReviewEnvironmentSecret(): ISecret {
        // Create a placeholder secret with _cdk suffix to avoid serverless conflicts: aurora_postgres_{stage}_cdk
        // The Lambda will update this with the actual logical database connection info
        return new Secret(this, 'ReviewDatabaseSecret', {
            secretName: `aurora_postgres_${this.stage}_cdk`,
            description: `Logical database credentials for review environment ${this.stage}`,
            generateSecretString: {
                secretStringTemplate: '{"username": "placeholder"}',
                generateStringKey: 'password',
                passwordLength: 30,
                excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
            },
        })
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
                entry: join(
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
                    'secretsmanager:DescribeSecret',
                    'secretsmanager:GetSecretValue',
                    'secretsmanager:PutSecretValue',
                    'secretsmanager:UpdateSecretVersionStage',
                    'secretsmanager:DeleteSecret',
                    'secretsmanager:GetRandomPassword',
                ],
                resources: ['*'],
            })
        )

        return dbManagerFunction
    }

    /**
     * Create bastion host for database access via SSM Session Manager
     * Uses gp3 volumes and includes PostgreSQL client tools
     */
    private createBastionHost(props: PostgresProps): Instance {
        // Create IAM role for bastion with SSM access
        const bastionRole = new Role(this, 'BastionRole', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
            description: 'IAM role for PostgreSQL bastion host',
            managedPolicies: [
                // SSM Session Manager access
                ManagedPolicy.fromAwsManagedPolicyName(
                    'AmazonSSMManagedInstanceCore'
                ),
                // CloudWatch logs
                ManagedPolicy.fromAwsManagedPolicyName(
                    'CloudWatchAgentServerPolicy'
                ),
            ],
        })

        // Grant read access to database secret
        this.databaseSecret.grantRead(bastionRole)

        // User data script to install PostgreSQL client
        const userData = UserData.forLinux()
        userData.addCommands(
            '#!/bin/bash',
            'yum update -y',
            '',
            '# Install PostgreSQL 16 client',
            'dnf install postgresql16 -y',
            '',
            '# Install Session Manager plugin',
            'yum install -y amazon-ssm-agent',
            'systemctl enable amazon-ssm-agent',
            'systemctl start amazon-ssm-agent',
            '',
            '# Create helper script for database connection',
            'cat > /usr/local/bin/connect-db << EOF',
            '#!/bin/bash',
            '# Get database credentials from Secrets Manager',
            `SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id ${this.databaseSecret.secretArn} --region ${this.region} --query SecretString --output text)`,
            'DB_HOST=$(echo $SECRET_JSON | jq -r .host)',
            'DB_PORT=$(echo $SECRET_JSON | jq -r .port)',
            'DB_NAME=$(echo $SECRET_JSON | jq -r .dbname)',
            'DB_USER=$(echo $SECRET_JSON | jq -r .username)',
            'export PGPASSWORD=$(echo $SECRET_JSON | jq -r .password)',
            '',
            'echo "Connecting to PostgreSQL database..."',
            'psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME',
            'EOF',
            '',
            'chmod +x /usr/local/bin/connect-db',
            '',
            '# Install jq for parsing JSON',
            'yum install -y jq',
            '',
            'echo "Bastion host setup complete. Use \'connect-db\' to access the database."'
        )

        // Create the bastion instance
        const bastion = new Instance(this, 'BastionHost', {
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
            machineImage: MachineImage.latestAmazonLinux2023({
                cpuType: AmazonLinuxCpuType.X86_64,
            }),
            vpc: props.vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroup: props.lambdaSecurityGroup,
            role: bastionRole,
            userData,
            blockDevices: [
                {
                    deviceName: '/dev/xvda',
                    volume: BlockDeviceVolume.ebs(8, {
                        volumeType: EbsDeviceVolumeType.GP3,
                        deleteOnTermination: true,
                        encrypted: true,
                    }),
                },
            ],
        })

        // Add tags
        Tags.of(bastion).add('Name', `postgres-${this.stage}-bastion`)
        Tags.of(bastion).add('Purpose', 'database-access')
        Tags.of(bastion).add('ManagedBy', 'CDK')

        return bastion
    }

    /**
     * Create stack outputs that match serverless outputs
     */
    private createOutputs(): void {
        const isReview = isReviewEnvironment(this.stage)

        // For review environments, output the logical database secret name (created by Lambda)
        // Lambda uses naming with -cdk suffix: aurora_postgres_{stageName}_cdk
        // For dev/val/prod, output the actual Aurora secret
        const secretName = isReview
            ? `aurora_postgres_${this.stage}_cdk`
            : this.databaseSecret.secretName

        // Note: For review environments, the ARN won't be resolvable until the Lambda creates it
        // but we can construct it predictably
        const secretArn = isReview
            ? `arn:aws:secretsmanager:${this.region}:${this.account}:secret:aurora_postgres_${this.stage}_cdk-??????`
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

        // Export Aurora ARN - for review environments, reference the dev cluster
        const auroraArn = this.cluster
            ? this.cluster.clusterArn
            : Fn.importValue('postgres-dev-cdk-PostgresAuroraV2Arn')

        new CfnOutput(this, 'PostgresAuroraV2Arn', {
            value: auroraArn,
            description: isReview
                ? 'CDK PostgreSQL Aurora cluster ARN (shared dev cluster)'
                : 'CDK PostgreSQL Aurora cluster ARN',
            exportName: this.exportName('PostgresAuroraV2Arn'),
        })

        if (this.cluster) {
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

        // Bastion host outputs (only for val/prod where it's enabled)
        if (this.bastionHost) {
            new CfnOutput(this, 'BastionInstanceId', {
                value: this.bastionHost.instanceId,
                description: 'Bastion host EC2 instance ID for SSM access',
                exportName: this.exportName('BastionInstanceId'),
            })

            new CfnOutput(this, 'BastionConnectCommand', {
                value: `aws ssm start-session --target ${this.bastionHost.instanceId}`,
                description:
                    'Command to connect to bastion via SSM Session Manager',
            })
        }
    }
}
