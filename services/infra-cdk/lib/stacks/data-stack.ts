import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import { AuroraServerlessV2 } from '@constructs/database';
import { stackName, resourceName, getConfig } from '../config';

export interface DataStackProps extends StackProps {
  stage: string;
  vpc: ec2.IVpc;
  databaseSecurityGroup: ec2.ISecurityGroup;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  vpnSecurityGroups?: ec2.ISecurityGroup[];
  alertTopic?: sns.ITopic;
}

/**
 * Data stack that creates Aurora Serverless v2 and S3 buckets
 */
export class DataStack extends Stack {
  public database: AuroraServerlessV2;
  public uploadsBucket: s3.IBucket;
  public qaBucket: s3.IBucket;
  private readonly stage: string;
  private readonly vpc: ec2.IVpc;
  private readonly databaseSecurityGroup: ec2.ISecurityGroup;
  private readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  private readonly vpnSecurityGroups?: ec2.ISecurityGroup[];
  private readonly alertTopic?: sns.ITopic;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, {
      ...props,
      stackName: stackName('Data', props.stage),
      description: 'Data stack for Managed Care Review - Aurora database and S3 buckets'
    });
    
    // Store properties after super() call
    this.stage = props.stage;
    this.vpc = props.vpc;
    this.databaseSecurityGroup = props.databaseSecurityGroup;
    this.lambdaSecurityGroup = props.lambdaSecurityGroup;
    this.vpnSecurityGroups = props.vpnSecurityGroups;
    this.alertTopic = props.alertTopic;
    
    // Define resources after all properties are initialized
    this.defineResources();
  }

  /**
   * Define data resources
   */
  private defineResources(): void {
    // Create Aurora Serverless v2 database
    this.createDatabase();

    // Create S3 buckets
    this.createS3Buckets();

    // Create outputs
    this.createOutputs();
  }


  /**
   * Create Aurora Serverless v2 database
   */
  private createDatabase(): void {
    // Validate prerequisites
    if (!this.vpc) {
      throw new Error('VPC not initialized in DataStack');
    }
    
    if (!this.databaseSecurityGroup) {
      throw new Error('Database security group not initialized in DataStack');
    }

    // Get ultra-lean config for this environment
    const config = getConfig(this.stage);
    
    // Use database configuration directly from ultra-lean config
    const databaseConfig = {
      ...config.database,
      // Use default PostgreSQL port (5432) to match Serverless implementation  
      backupRetentionPeriod: config.database.backupRetentionDays
    };

    // Use provided VPN security groups instead of lookups
    const additionalSecurityGroups = this.vpnSecurityGroups || [];

    this.database = new AuroraServerlessV2(this, 'Database', {
      databaseName: 'managed_care_review',
      stage: this.stage,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroup: this.databaseSecurityGroup,
      additionalSecurityGroups,
      databaseConfig,
      alertTopic: this.alertTopic
    });
  }

  /**
   * Create S3 buckets with proper security configurations
   */
  private createS3Buckets(): void {
    const config = getConfig(this.stage);
    
    // Create S3 access logging bucket (CDK Nag AwsSolutions-S1)
    const loggingBucket = new s3.Bucket(this, 'S3LoggingBucket', {
      bucketName: `mcr-cdk-${this.stage}-uploads-s3-logs`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [{
        id: 'delete-old-logs',
        expiration: Duration.days(90),
        enabled: true
      }],
      removalPolicy: config.database.deletionProtection ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY
    });

    // Create uploads bucket with enhanced security
    this.uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: `mcr-cdk-${this.stage}-uploads`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      serverAccessLogsBucket: loggingBucket,
      serverAccessLogsPrefix: 'uploads/',
      cors: [{
        allowedMethods: [
          s3.HttpMethods.GET,
          s3.HttpMethods.PUT,
          s3.HttpMethods.POST,
          s3.HttpMethods.DELETE,
          s3.HttpMethods.HEAD
        ],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        exposedHeaders: ['ETag'],
        maxAge: 3000
      }],
      removalPolicy: config.deletionProtection ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !config.deletionProtection
    });

    // Add bucket policy to restrict file types
    this.uploadsBucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'DenyUnsupportedFileTypes',
      effect: iam.Effect.DENY,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:PutObject'],
      notResources: [
        `${this.uploadsBucket.bucketArn}/*.csv`,
        `${this.uploadsBucket.bucketArn}/*.doc`,
        `${this.uploadsBucket.bucketArn}/*.docx`,
        `${this.uploadsBucket.bucketArn}/*.pdf`,
        `${this.uploadsBucket.bucketArn}/*.txt`,
        `${this.uploadsBucket.bucketArn}/*.xls`,
        `${this.uploadsBucket.bucketArn}/*.xlsx`,
        `${this.uploadsBucket.bucketArn}/*.zip`,
        `${this.uploadsBucket.bucketArn}/*.xlsm`,
        `${this.uploadsBucket.bucketArn}/*.xltm`,
        `${this.uploadsBucket.bucketArn}/*.xlam`
      ]
    }));


    // Create QA bucket
    this.qaBucket = new s3.Bucket(this, 'QaBucket', {
      bucketName: `mcr-cdk-${this.stage}-qa`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      serverAccessLogsBucket: loggingBucket,
      serverAccessLogsPrefix: 'qa/',
      cors: [{
        allowedMethods: [
          s3.HttpMethods.GET,
          s3.HttpMethods.PUT,
          s3.HttpMethods.POST,
          s3.HttpMethods.DELETE,
          s3.HttpMethods.HEAD
        ],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        exposedHeaders: ['ETag'],
        maxAge: 3000
      }],
      removalPolicy: config.deletionProtection ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !config.deletionProtection
    });

    // Add same file type restrictions to QA bucket
    this.qaBucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'DenyUnsupportedFileTypes',
      effect: iam.Effect.DENY,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:PutObject'],
      notResources: [
        `${this.qaBucket.bucketArn}/*.csv`,
        `${this.qaBucket.bucketArn}/*.doc`,
        `${this.qaBucket.bucketArn}/*.docx`,
        `${this.qaBucket.bucketArn}/*.pdf`,
        `${this.qaBucket.bucketArn}/*.txt`,
        `${this.qaBucket.bucketArn}/*.xls`,
        `${this.qaBucket.bucketArn}/*.xlsx`,
        `${this.qaBucket.bucketArn}/*.zip`,
        `${this.qaBucket.bucketArn}/*.xlsm`,
        `${this.qaBucket.bucketArn}/*.xltm`,
        `${this.qaBucket.bucketArn}/*.xlam`
      ]
    }));

  }

  /**
   * Create stack outputs with exact CloudFormation export names
   */
  private createOutputs(): void {
    // Only add exports that CDK doesn't auto-generate
    // These endpoint exports are needed but not auto-generated by cross-stack references
    new CfnOutput(this, 'DatabaseEndpointAddress', {
      value: this.database.clusterEndpoint.hostname,
      exportName: 'MCR-Data-dev-cdk:ExportsOutputFnGetAttDatabaseCluster5B53A178EndpointAddressF04326D4'
    });

    new CfnOutput(this, 'DatabaseEndpointPort', {
      value: this.database.clusterEndpoint.port.toString(),
      exportName: 'MCR-Data-dev-cdk:ExportsOutputFnGetAttDatabaseCluster5B53A178EndpointPort168B3F2A'
    });

    // Temporary manual export to maintain the existing export value during migration
    new CfnOutput(this, 'DatabaseSecretExport', {
      value: 'arn:aws:secretsmanager:us-east-1:121499393294:secret:aurora_postgres_dev-IlOzUf',
      exportName: 'MCR-Data-dev-cdk:ExportsOutputRefDatabaseSecret3B81719527782CE7'
    });

    // Outputs for GitHub Actions workflow (existing format)
    new CfnOutput(this, 'DocumentUploadsBucketName', {
      value: this.uploadsBucket.bucketName,
      description: 'Name of the document uploads S3 bucket'
    });

    new CfnOutput(this, 'QAUploadsBucketName', {
      value: this.qaBucket.bucketName,
      description: 'Name of the QA uploads S3 bucket'
    });

    // Outputs for app-web cf: lookups (serverless compatibility)
    new CfnOutput(this, 'DocumentUploadsBucketNameExport', {
      value: this.uploadsBucket.bucketName,
      exportName: `uploads-${this.stage}-DocumentUploadsBucketName`,
      description: 'Document uploads bucket name for cf: lookups'
    });

    new CfnOutput(this, 'QAUploadsBucketNameExport', {
      value: this.qaBucket.bucketName,
      exportName: `uploads-${this.stage}-QAUploadsBucketName`,
      description: 'QA uploads bucket name for cf: lookups'
    });

    new CfnOutput(this, 'RegionExport', {
      value: this.region,
      exportName: `uploads-${this.stage}-Region`,
      description: 'AWS region for cf: lookups'
    });

    // CDK auto-generates these 6 exports when DatabaseOperationsStack references the objects:
    // - QaBucketArn (ExportsOutputFnGetAttQaBucket1AC3D02AArnE30107FB)
    // - UploadsBucketArn (ExportsOutputFnGetAttUploadsBucket5E5E9B64Arn8603C131)
    // - DatabaseClusterRef (ExportsOutputRefDatabaseCluster5B53A178FF23F606)
    // - DatabaseSecretRef (ExportsOutputRefDatabaseSecret3B81719527782CE7)
    // - QaBucketRef (ExportsOutputRefQaBucket1AC3D02AF8C962F2)
    // - UploadsBucketRef (ExportsOutputRefUploadsBucket5E5E9B64F2F56CC2)
  }
}
