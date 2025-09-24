import { BaseStack, BaseStackProps } from '@constructs/base';
import { AuroraServerlessV2 } from '@constructs/database';
import { SecureS3Bucket } from '@constructs/storage';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { getEnvironment, S3_BUCKETS, SERVICES } from '@config/index';

export interface DataStackProps extends BaseStackProps {
  vpc: ec2.IVpc;
  databaseSecurityGroup: ec2.ISecurityGroup;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  vpnSecurityGroups?: ec2.ISecurityGroup[];
  alertTopic?: sns.ITopic;
}

/**
 * Data stack that creates Aurora Serverless v2 and S3 buckets
 */
export class DataStack extends BaseStack {
  public database: AuroraServerlessV2;
  public uploadsBucket: s3.IBucket;
  public qaBucket: s3.IBucket;
  private readonly vpc: ec2.IVpc;
  private readonly databaseSecurityGroup: ec2.ISecurityGroup;
  private readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  private readonly vpnSecurityGroups?: ec2.ISecurityGroup[];
  private readonly alertTopic?: sns.ITopic;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, {
      ...props,
      description: 'Data stack for Managed Care Review - Aurora database and S3 buckets'
    });
    
    // Store properties after super() call
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
  protected defineResources(): void {
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
    const config = getEnvironment(this.stage);
    
    // Use database configuration directly from ultra-lean config
    const databaseConfig = {
      ...config.database,
      // Use default PostgreSQL port (5432) to match Serverless implementation  
      backupRetentionPeriod: config.database.backupRetentionDays
    };

    // Use provided VPN security groups instead of lookups
    const additionalSecurityGroups = this.vpnSecurityGroups || [];

    this.database = new AuroraServerlessV2(this, 'Database', {
      databaseName: SERVICES.POSTGRES,
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
    const config = getEnvironment(this.stage);
    
    // Create S3 access logging bucket (CDK Nag AwsSolutions-S1)
    const loggingBucket = new s3.Bucket(this, 'S3LoggingBucket', {
      bucketName: `mcr-${this.stage}-${S3_BUCKETS.UPLOADS}-logs${this.account ? `-${this.account}` : ''}`,
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
    const uploadsBucket = new SecureS3Bucket(this, 'UploadsBucket', {
      bucketName: S3_BUCKETS.UPLOADS,
      stage: this.stage,
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
      }]
    });
    this.uploadsBucket = uploadsBucket.bucket;

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
    const qaBucket = new SecureS3Bucket(this, 'QaBucket', {
      bucketName: S3_BUCKETS.QA,
      stage: this.stage,
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
      }]
    });
    this.qaBucket = qaBucket.bucket;

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
   * Create stack outputs
   */
  private createOutputs(): void {
    new CfnOutput(this, 'DocumentUploadsBucketName', {
      value: this.uploadsBucket.bucketName,
      description: 'Document uploads S3 bucket name'
    });

    new CfnOutput(this, 'QAUploadsBucketName', {
      value: this.qaBucket.bucketName,
      description: 'QA uploads S3 bucket name'
    });
  }
}
