import { BaseStack, BaseStackProps } from '@constructs/base';
import { Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as kinesis from 'aws-cdk-lib/aws-kinesisfirehose';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Duration, RemovalPolicy, SecretValue } from 'aws-cdk-lib';
import { SERVICES } from '@config/constants';
// import { NagSuppressions } from 'cdk-nag';

export interface SupportingInfrastructureStackProps extends BaseStackProps {
  vpc: ec2.IVpc;
  databaseSecurityGroup: ec2.ISecurityGroup;
}

/**
 * Supporting infrastructure stack for monitoring, bastion access, and utilities
 */
export class SupportingInfrastructureStack extends BaseStack {
  public bastionInstance?: ec2.IInstance;
  public newRelicIntegration?: iam.IRole;
  private readonly vpc: ec2.IVpc;
  private readonly databaseSecurityGroup?: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: SupportingInfrastructureStackProps) {
    super(scope, id, {
      ...props,
      description: 'Supporting infrastructure for Managed Care Review - monitoring and utilities'
    });
    
    // Store required props
    this.vpc = props.vpc;
    this.databaseSecurityGroup = props.databaseSecurityGroup;
    
    this.defineResources();
  }

  /**
   * Define supporting infrastructure resources
   */
  protected defineResources(): void {
    // Always use Systems Manager for all environments
    this.setupSystemsManager();
    
    // Apply CDK Nag suppressions
    // this.applyCdkNagSuppressions();
  }

  /**
   * Setup Systems Manager for secure database access (modern approach)
   */
  private setupSystemsManager(): void {

    // Create SSM document for database connection
    new ssm.CfnDocument(this, 'DatabaseConnectionDocument', {
      documentType: 'Session',
      documentFormat: 'YAML',
      name: `mcr-${this.stage}-db-connection`,
      content: {
        schemaVersion: '1.0',
        description: 'Document to connect to RDS PostgreSQL via SSM Session Manager',
        sessionType: 'Port',
        parameters: {
          portNumber: {
            type: 'String',
            description: 'Port number to forward',
            default: '5432'
          },
          localPortNumber: {
            type: 'String',
            description: 'Local port number to use',
            default: '5432'
          }
        }
      }
    });

    // Create VPC endpoints for SSM if they don't exist
    const ssmEndpoint = new ec2.InterfaceVpcEndpoint(this, 'SSMVpcEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }
    });

    const ssmMessagesEndpoint = new ec2.InterfaceVpcEndpoint(this, 'SSMMessagesVpcEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }
    });

    const ec2MessagesEndpoint = new ec2.InterfaceVpcEndpoint(this, 'EC2MessagesVpcEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }
    });
  }

  /**
   * Create New Relic monitoring integration
   */
  private createNewRelicIntegration(): void {
    // New Relic configuration would come from environment variables
    const nrLicenseKey = process.env.NEW_RELIC_LICENSE_KEY;
    const nrExternalId = process.env.NEW_RELIC_EXTERNAL_ID;
    
    if (!nrLicenseKey || !nrExternalId) {
      console.warn('New Relic configuration incomplete, skipping integration');
      return;
    }

    // Create IAM role for New Relic
    this.newRelicIntegration = new iam.Role(this, 'NewRelicInfraIntegrations', {
      roleName: 'NewRelicInfraIntegrations',
      assumedBy: new iam.ArnPrincipal('arn:aws:iam::754728514883:root'),
      externalIds: [nrExternalId],
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('ReadOnlyAccess')
      ],
      inlinePolicies: {
        NewRelicBudget: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['budgets:ViewBudget'],
              resources: ['*']
            })
          ]
        })
      }
    });

    // Create S3 bucket for Firehose
    const firehoseBucket = new s3.Bucket(this, 'NewRelicFirehoseBucket', {
      bucketName: `newrelic-firehose-${this.stage}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{
        id: 'delete-old-logs',
        enabled: true,
        expiration: Duration.days(7)
      }],
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Create Firehose role
    const firehoseRole = new iam.Role(this, 'NewRelicFirehoseRole', {
      roleName: 'NewRelicInfraFirehoseRole',
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
      inlinePolicies: {
        FirehoseS3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:AbortMultipartUpload',
                's3:GetBucketLocation',
                's3:GetObject',
                's3:ListBucket',
                's3:ListBucketMultipartUploads',
                's3:PutObject'
              ],
              resources: [
                firehoseBucket.bucketArn,
                `${firehoseBucket.bucketArn}/*`
              ]
            })
          ]
        })
      }
    });

    // Store license key in Secrets Manager
    const nrLicenseSecret = new secretsmanager.Secret(this, 'NewRelicLicenseKey', {
      secretName: `/configuration/nr_license_key`,
      secretStringValue: SecretValue.unsafePlainText(nrLicenseKey)
    });

    // Create Kinesis Firehose delivery stream
    const deliveryStream = new kinesis.CfnDeliveryStream(this, 'NewRelicDeliveryStream', {
      deliveryStreamName: 'NewRelic-Delivery-Stream',
      deliveryStreamType: 'DirectPut',
      httpEndpointDestinationConfiguration: {
        endpointConfiguration: {
          name: 'New Relic',
          url: 'https://aws-api.newrelic.com/cloudwatch-metrics/v1',
          accessKey: nrLicenseSecret.secretValue.toString()
        },
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 1
        },
        retryOptions: {
          durationInSeconds: 60
        },
        s3Configuration: {
          bucketArn: firehoseBucket.bucketArn,
          compressionFormat: 'GZIP',
          roleArn: firehoseRole.roleArn
        },
        roleArn: firehoseRole.roleArn,
        requestConfiguration: {
          contentEncoding: 'GZIP'
        }
      }
    });

    // Create CloudWatch Metric Stream role
    const metricStreamRole = new iam.Role(this, 'MetricStreamRole', {
      roleName: 'NewRelicInfraMetricStreamRole',
      assumedBy: new iam.ServicePrincipal('streams.metrics.cloudwatch.amazonaws.com'),
      externalIds: [this.account],
      inlinePolicies: {
        MetricStreamFirehose: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'firehose:PutRecord',
                'firehose:PutRecordBatch'
              ],
              resources: [deliveryStream.attrArn]
            })
          ]
        })
      }
    });

    // Create CloudWatch Metric Stream
    new cloudwatch.CfnMetricStream(this, 'NewRelicMetricStream', {
      name: 'NewRelic-Metric-Stream',
      firehoseArn: deliveryStream.attrArn,
      roleArn: metricStreamRole.roleArn,
      outputFormat: 'opentelemetry0.7'
    });
  }

  /**
   * Apply CDK Nag suppressions
   */
  //   private applyCdkNagSuppressions(): void {
  // CDK Nag suppressions temporarily disabled
  // }
}