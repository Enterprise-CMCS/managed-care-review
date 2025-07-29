import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { DatabaseConfig } from '@config/index';
import { ResourceNames, CDK_DEPLOYMENT_SUFFIX } from '@config/index';
import { ServiceRegistry } from '@constructs/base';
// import { NagSuppressions } from 'cdk-nag';

export interface AuroraServerlessV2Props {
  databaseName: string;
  stage: string;
  vpc: ec2.IVpc;
  vpcSubnets: ec2.SubnetSelection;
  securityGroup: ec2.ISecurityGroup;
  additionalSecurityGroups?: ec2.ISecurityGroup[];
  databaseConfig: DatabaseConfig;
  alertTopic?: sns.ITopic;
}

/**
 * Aurora Serverless v2 PostgreSQL cluster
 */
export class AuroraServerlessV2 extends Construct {
  public readonly cluster: rds.DatabaseCluster;
  public readonly secret: secretsmanager.ISecret;
  public readonly clusterEndpoint: rds.Endpoint;
  public readonly clusterReadEndpoint: rds.Endpoint;

  constructor(scope: Construct, id: string, props: AuroraServerlessV2Props) {
    super(scope, id);

    // Validate required properties
    if (!props.vpc) {
      throw new Error('VPC must be supplied to AuroraServerlessV2');
    }
    
    if (!props.securityGroup) {
      throw new Error('Security group must be supplied to AuroraServerlessV2');
    }
    
    // Validate subnet selection
    const { subnets } = props.vpc.selectSubnets(props.vpcSubnets || {
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
    });
    
    if (subnets.length < 2) {
      throw new Error(`Aurora Serverless V2 requires at least 2 subnets in different AZs, got ${subnets.length}`);
    }
    
    // Validate AZ diversity
    const azs = new Set(subnets.map(subnet => subnet.availabilityZone));
    if (azs.size < 2) {
      throw new Error(`Aurora Serverless V2 requires subnets in at least 2 different AZs, got ${azs.size}`);
    }

    // Create database credentials secret
    // Use CDK-specific naming to avoid conflicts with serverless
    this.secret = new secretsmanager.Secret(this, 'Secret', {
      secretName: `mcr-cdk-aurora-postgres-${props.stage}`,
      description: `Database credentials for ${props.databaseName} - ${props.stage}`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'mcreviewadmin'
        }),
        generateStringKey: 'password',
        excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
        passwordLength: 30
      }
    });

    // Create parameter group for PostgreSQL 14
    const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_9
      }),
      description: `Parameter group for ${props.databaseName} - ${props.stage}`,
      parameters: {
        'shared_preload_libraries': 'pg_stat_statements',
        'pg_stat_statements.track': 'ALL',
        'log_statement': 'all',
        'log_min_duration_statement': '1000' // Log queries taking more than 1 second
      }
    });

    // Create the Aurora Serverless v2 cluster
    this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_9
      }),
      credentials: rds.Credentials.fromSecret(this.secret),
      clusterIdentifier: ResourceNames.resourceName('database', 'cluster', props.stage) + CDK_DEPLOYMENT_SUFFIX,
      // RDS database names must be alphanumeric only (no underscores)
      defaultDatabaseName: `aurorapostgres${props.stage}${Stack.of(this).account}cdk`,
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: [props.securityGroup, ...(props.additionalSecurityGroups || [])],
      parameterGroup,
      serverlessV2MinCapacity: props.databaseConfig.minCapacity,
      serverlessV2MaxCapacity: props.databaseConfig.maxCapacity,
      enableDataApi: props.databaseConfig.enableDataApi,
      backup: {
        retention: Duration.days(props.databaseConfig.backupRetentionDays),
        preferredWindow: '03:00-04:00'
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
      writer: rds.ClusterInstance.serverlessV2('WriterInstance', {
        autoMinorVersionUpgrade: true,
        publiclyAccessible: false,
        enablePerformanceInsights: props.stage === 'prod',
        performanceInsightRetention: props.stage === 'prod' 
          ? rds.PerformanceInsightRetention.DEFAULT 
          : undefined
      }),
      readers: props.stage === 'prod' ? [
        rds.ClusterInstance.serverlessV2('ReaderInstance', {
          autoMinorVersionUpgrade: true,
          publiclyAccessible: false,
          enablePerformanceInsights: true,
          performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
          instanceIdentifier: ResourceNames.resourceName('database', 'reader', props.stage)
        })
      ] : undefined
    });

    // Store endpoints
    this.clusterEndpoint = this.cluster.clusterEndpoint;
    this.clusterReadEndpoint = this.cluster.clusterReadEndpoint;

    // Add CloudWatch alarms
    this.addCloudWatchAlarms(props);

    // Store values in Parameter Store
    this.storeInParameterStore(props.stage);

    // Apply CDK Nag suppressions
    this.applyCdkNagSuppressions(props);
  }

  /**
   * Add CloudWatch alarms for monitoring
   */
  private addCloudWatchAlarms(props: AuroraServerlessV2Props): void {
    // CPU utilization alarm
    const cpuAlarm = new cloudwatch.Alarm(this, 'HighCpuAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          DBClusterIdentifier: this.cluster.clusterIdentifier
        },
        statistic: 'Average',
        period: Duration.minutes(5)
      }),
      threshold: 80,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: `High CPU utilization for ${props.databaseName} database`
    });

    // Database connections alarm
    const connectionsAlarm = new cloudwatch.Alarm(this, 'HighConnectionsAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'DatabaseConnections',
        dimensionsMap: {
          DBClusterIdentifier: this.cluster.clusterIdentifier
        },
        statistic: 'Average',
        period: Duration.minutes(5)
      }),
      threshold: props.stage === 'prod' ? 100 : 50,
      evaluationPeriods: 2,
      alarmDescription: `High connection count for ${props.databaseName} database`
    });

    // Add SNS topic if provided
    if (props.alertTopic) {
      cpuAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(props.alertTopic));
      connectionsAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(props.alertTopic));
    }
  }

  /**
   * Store cluster information in Parameter Store
   */
  private storeInParameterStore(stage: string): void {
    ServiceRegistry.putDatabaseClusterArn(this, stage, this.cluster.clusterArn);
    ServiceRegistry.putDatabaseSecretArn(this, stage, this.secret.secretArn);
    
    // Store endpoints
    ServiceRegistry.putValue(
      this,
      'database',
      'writer-endpoint',
      this.clusterEndpoint.hostname,
      stage,
      'Database writer endpoint'
    );
    
    ServiceRegistry.putValue(
      this,
      'database',
      'reader-endpoint',
      this.clusterReadEndpoint.hostname,
      stage,
      'Database reader endpoint'
    );
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
  public grantSecretRead(grantee: iam.IGrantable): iam.Grant {
    return this.secret.grantRead(grantee);
  }

  /**
   * Grant data API access (if enabled)
   */
  public grantDataApiAccess(grantee: iam.IGrantable): iam.Grant {
    return this.cluster.grantDataApiAccess(grantee);
  }
}
