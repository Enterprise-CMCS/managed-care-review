import { Construct } from 'constructs'
import {
    DatabaseCluster,
    DatabaseClusterEngine,
    AuroraPostgresEngineVersion,
    Credentials,
    ClusterInstance,
    type Endpoint,
} from 'aws-cdk-lib/aws-rds'
import type { IVpc, SubnetSelection, ISecurityGroup } from 'aws-cdk-lib/aws-ec2'
import type { IGrantable, Grant } from 'aws-cdk-lib/aws-iam'
import { Secret, type ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import {
    type DatabaseConfig,
    ResourceNames,
    CDK_DEPLOYMENT_SUFFIX,
} from '../../config/index'

export interface AuroraServerlessV2Props {
    databaseName: string
    stage: string
    vpc: IVpc
    vpcSubnets: SubnetSelection
    securityGroup: ISecurityGroup
    additionalSecurityGroups?: ISecurityGroup[]
    databaseConfig: DatabaseConfig
}

/**
 * Aurora Serverless v2 PostgreSQL cluster
 */
export class AuroraServerlessV2 extends Construct {
    public readonly cluster: DatabaseCluster
    public readonly secret: ISecret
    public readonly clusterEndpoint: Endpoint
    public readonly clusterReadEndpoint: Endpoint

    constructor(scope: Construct, id: string, props: AuroraServerlessV2Props) {
        super(scope, id)

        // Validate required properties
        if (!props.vpc) {
            throw new Error('VPC must be supplied to AuroraServerlessV2')
        }

        if (!props.securityGroup) {
            throw new Error(
                'Security group must be supplied to AuroraServerlessV2'
            )
        }

        // Validate subnet selection
        const { subnets } = props.vpc.selectSubnets(props.vpcSubnets)

        if (subnets.length < 2) {
            throw new Error(
                `Aurora Serverless V2 requires at least 2 subnets in different AZs, got ${subnets.length}`
            )
        }

        // Validate AZ diversity
        const azs = new Set(subnets.map((subnet) => subnet.availabilityZone))
        if (azs.size < 2) {
            throw new Error(
                `Aurora Serverless V2 requires subnets in at least 2 different AZs, got ${azs.size}`
            )
        }

        // Create database credentials secret
        // Use CDK-specific naming to avoid conflicts with serverless
        this.secret = new Secret(this, 'Secret', {
            secretName: `aurora-postgres-${props.stage}-cdk`,
            description: `Database credentials for ${props.databaseName} - ${props.stage}`,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    username: 'mcreviewadmin',
                }),
                generateStringKey: 'password',
                excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
                passwordLength: 30,
            },
        })

        // Create the Aurora Serverless v2 cluster
        this.cluster = new DatabaseCluster(this, 'Cluster', {
            engine: DatabaseClusterEngine.auroraPostgres({
                version: AuroraPostgresEngineVersion.VER_16_9,
            }),
            credentials: Credentials.fromSecret(this.secret),
            clusterIdentifier:
                ResourceNames.resourceName('database', 'cluster', props.stage) +
                CDK_DEPLOYMENT_SUFFIX,
            // RDS database names must be alphanumeric only (no underscores)
            defaultDatabaseName: `aurorapostgres${props.stage}${Stack.of(this).account}cdk`,
            vpc: props.vpc,
            vpcSubnets: props.vpcSubnets,
            securityGroups: [
                props.securityGroup,
                ...(props.additionalSecurityGroups || []),
            ],
            serverlessV2MinCapacity: props.databaseConfig.minCapacity,
            serverlessV2MaxCapacity: props.databaseConfig.maxCapacity,
            enableDataApi: props.databaseConfig.enableDataApi,
            backup: {
                retention: Duration.days(
                    props.databaseConfig.backupRetentionDays
                ),
                preferredWindow: '03:00-04:00',
            },
            preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
            deletionProtection: props.databaseConfig.deletionProtection,
            removalPolicy: props.databaseConfig.deletionProtection
                ? RemovalPolicy.RETAIN
                : RemovalPolicy.DESTROY,
            storageEncrypted: true,
            cloudwatchLogsExports: ['postgresql'],
            iamAuthentication: false,
            writer: ClusterInstance.serverlessV2('WriterInstance', {
                autoMinorVersionUpgrade: true,
                publiclyAccessible: false,
            }),
        })

        // Store endpoints
        this.clusterEndpoint = this.cluster.clusterEndpoint
        this.clusterReadEndpoint = this.cluster.clusterReadEndpoint
    }

    /**
     * Grant access to the database secret
     */
    public grantSecretRead(grantee: IGrantable): Grant {
        return this.secret.grantRead(grantee)
    }

    /**
     * Grant data API access (if enabled)
     */
    public grantDataApiAccess(grantee: IGrantable): Grant {
        return this.cluster.grantDataApiAccess(grantee)
    }
}
