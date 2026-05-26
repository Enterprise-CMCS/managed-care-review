import { Construct } from 'constructs'
import {
    DatabaseCluster,
    DatabaseClusterEngine,
    AuroraPostgresEngineVersion,
    Credentials,
    ClusterInstance,
} from 'aws-cdk-lib/aws-rds'
import type { IVpc, SubnetSelection, ISecurityGroup } from 'aws-cdk-lib/aws-ec2'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import type { DatabaseConfig } from '../../config/environments'
import { ResourceNames } from '../../config/shared'

export interface AuroraServerlessV2Props {
    databaseName: string
    databaseSecretName: string
    stage: string
    vpc: IVpc
    vpcSubnets: SubnetSelection
    securityGroup: ISecurityGroup
    databaseConfig: DatabaseConfig
}

/**
 * Aurora Serverless v2 PostgreSQL cluster
 */
export class AuroraServerlessV2 extends Construct {
    public readonly cluster: DatabaseCluster
    public readonly secret: ISecret

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

        // Create the Aurora Serverless v2 cluster.
        // Use the existing, stable database secret so exported secret names do not change.
        const databaseSecret = Secret.fromSecretNameV2(
            this,
            'DatabaseSecret',
            props.databaseSecretName
        )

        this.cluster = new DatabaseCluster(this, 'Cluster', {
            engine: DatabaseClusterEngine.auroraPostgres({
                version: AuroraPostgresEngineVersion.VER_16_9,
            }),
            credentials: Credentials.fromSecret(
                databaseSecret,
                'mcreviewadmin'
            ),
            clusterIdentifier: ResourceNames.resourceName(
                'postgres',
                'cluster',
                props.stage
            ),
            // Database name matches serverless pattern: aurora_postgres_{stage}_{account}_cdk
            defaultDatabaseName: `aurora_postgres_${props.stage}_${Stack.of(this).account}_cdk`,
            vpc: props.vpc,
            vpcSubnets: props.vpcSubnets,
            securityGroups: [props.securityGroup],
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

        // cluster.secret is the attached database secret with connection fields populated.
        this.secret = this.cluster.secret!

        // Rotate the admin password via the Secrets Manager hosted rotation Lambda.
        this.cluster.addRotationSingleUser({
            automaticallyAfter: Duration.days(
                props.databaseConfig.passwordRotationDays
            ),
            vpcSubnets: props.vpcSubnets,
            securityGroup: props.securityGroup,
            excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
        })
    }
}
