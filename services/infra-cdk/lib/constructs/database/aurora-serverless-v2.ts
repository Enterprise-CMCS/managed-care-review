import { Construct } from 'constructs'
import {
    DatabaseCluster,
    DatabaseClusterEngine,
    AuroraPostgresEngineVersion,
    Credentials,
    ParameterGroup,
    ClusterInstance,
    PerformanceInsightRetention,
    type Endpoint,
} from 'aws-cdk-lib/aws-rds'
import type { IVpc, SubnetSelection, ISecurityGroup } from 'aws-cdk-lib/aws-ec2'
import type { IGrantable, Grant } from 'aws-cdk-lib/aws-iam'
import { Secret, type ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { Alarm, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch'
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions'
import type { ITopic } from 'aws-cdk-lib/aws-sns'
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import {
    type DatabaseConfig,
    ResourceNames,
    CDK_DEPLOYMENT_SUFFIX,
} from '../../config/index'
import { ServiceRegistry } from '../base'
// import { NagSuppressions } from 'cdk-nag';

export interface AuroraServerlessV2Props {
    databaseName: string
    stage: string
    vpc: IVpc
    vpcSubnets: SubnetSelection
    securityGroup: ISecurityGroup
    additionalSecurityGroups?: ISecurityGroup[]
    databaseConfig: DatabaseConfig
    alertTopic?: ITopic
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
            secretName: `mcr-cdk-aurora-postgres-${props.stage}`,
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

        // Create parameter group for PostgreSQL 14
        const parameterGroup = new ParameterGroup(this, 'ParameterGroup', {
            engine: DatabaseClusterEngine.auroraPostgres({
                version: AuroraPostgresEngineVersion.VER_14_9,
            }),
            description: `Parameter group for ${props.databaseName} - ${props.stage}`,
            parameters: {
                shared_preload_libraries: 'pg_stat_statements',
                'pg_stat_statements.track': 'ALL',
                log_statement: 'all',
                log_min_duration_statement: '1000', // Log queries taking more than 1 second
            },
        })

        // Create the Aurora Serverless v2 cluster
        this.cluster = new DatabaseCluster(this, 'Cluster', {
            engine: DatabaseClusterEngine.auroraPostgres({
                version: AuroraPostgresEngineVersion.VER_14_9,
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
            parameterGroup,
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
            monitoringInterval: Duration.seconds(60),
            cloudwatchLogsExports: ['postgresql'],
            iamAuthentication: false,
            writer: ClusterInstance.serverlessV2('WriterInstance', {
                autoMinorVersionUpgrade: true,
                publiclyAccessible: false,
                enablePerformanceInsights: props.stage === 'prod',
                performanceInsightRetention:
                    props.stage === 'prod'
                        ? PerformanceInsightRetention.DEFAULT
                        : undefined,
            }),
            readers:
                props.stage === 'prod'
                    ? [
                          ClusterInstance.serverlessV2('ReaderInstance', {
                              autoMinorVersionUpgrade: true,
                              publiclyAccessible: false,
                              enablePerformanceInsights: true,
                              performanceInsightRetention:
                                  PerformanceInsightRetention.DEFAULT,
                              instanceIdentifier: ResourceNames.resourceName(
                                  'database',
                                  'reader',
                                  props.stage
                              ),
                          }),
                      ]
                    : undefined,
        })

        // Store endpoints
        this.clusterEndpoint = this.cluster.clusterEndpoint
        this.clusterReadEndpoint = this.cluster.clusterReadEndpoint

        // Add CloudWatch alarms
        this.addCloudWatchAlarms(props)

        // Store values in Parameter Store
        this.storeInParameterStore(props.stage)

        // Apply CDK Nag suppressions
        this.applyCdkNagSuppressions(props)
    }

    /**
     * Add CloudWatch alarms for monitoring
     */
    private addCloudWatchAlarms(props: AuroraServerlessV2Props): void {
        // CPU utilization alarm
        const cpuAlarm = new Alarm(this, 'HighCpuAlarm', {
            metric: new Metric({
                namespace: 'AWS/RDS',
                metricName: 'CPUUtilization',
                dimensionsMap: {
                    DBClusterIdentifier: this.cluster.clusterIdentifier,
                },
                statistic: 'Average',
                period: Duration.minutes(5),
            }),
            threshold: 80,
            evaluationPeriods: 2,
            treatMissingData: TreatMissingData.NOT_BREACHING,
            alarmDescription: `High CPU utilization for ${props.databaseName} database`,
        })

        // Database connections alarm
        const connectionsAlarm = new Alarm(this, 'HighConnectionsAlarm', {
            metric: new Metric({
                namespace: 'AWS/RDS',
                metricName: 'DatabaseConnections',
                dimensionsMap: {
                    DBClusterIdentifier: this.cluster.clusterIdentifier,
                },
                statistic: 'Average',
                period: Duration.minutes(5),
            }),
            threshold: props.stage === 'prod' ? 100 : 50,
            evaluationPeriods: 2,
            alarmDescription: `High connection count for ${props.databaseName} database`,
        })

        // Add SNS topic if provided
        if (props.alertTopic) {
            cpuAlarm.addAlarmAction(new SnsAction(props.alertTopic))
            connectionsAlarm.addAlarmAction(new SnsAction(props.alertTopic))
        }
    }

    /**
     * Store cluster information in Parameter Store
     */
    private storeInParameterStore(stage: string): void {
        ServiceRegistry.putDatabaseClusterArn(
            this,
            stage,
            this.cluster.clusterArn
        )
        ServiceRegistry.putDatabaseSecretArn(this, stage, this.secret.secretArn)

        // Store endpoints
        ServiceRegistry.putValue(
            this,
            'database',
            'writer-endpoint',
            this.clusterEndpoint.hostname,
            stage,
            'Database writer endpoint'
        )

        ServiceRegistry.putValue(
            this,
            'database',
            'reader-endpoint',
            this.clusterReadEndpoint.hostname,
            stage,
            'Database reader endpoint'
        )
    }

    /**
     * Apply CDK Nag suppressions
     */
    private applyCdkNagSuppressions(props: AuroraServerlessV2Props): void {
        // CDK Nag suppressions temporarily disabled
        // Will be re-enabled once synthesis is working
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
