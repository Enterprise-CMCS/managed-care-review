import { BaseStack, BaseStackProps } from '@constructs/base';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { SERVICES } from '@config/constants';
// import { NagSuppressions } from 'cdk-nag';

export interface SSMDatabaseAccessStackProps extends BaseStackProps {
  vpc: ec2.IVpc;
  databaseCluster: rds.IDatabaseCluster;
  databaseSecret: secretsmanager.ISecret;
  databaseSecurityGroup: ec2.ISecurityGroup;
  lambdaSecurityGroup: ec2.ISecurityGroup;
}

/**
 * SSM Session Manager stack for secure database access without bastion hosts
 * This provides a modern, secure way to connect to Aurora PostgreSQL
 */
export class SSMDatabaseAccessStack extends BaseStack {
  public ssmDocument: ssm.CfnDocument;
  public ssmRole: iam.IRole;
  public readonly portForwardingLambda?: lambda.IFunction;
  public ssmEndpoints: ec2.IInterfaceVpcEndpoint[];
  private readonly vpc: ec2.IVpc;
  private readonly databaseCluster: rds.IDatabaseCluster;
  private readonly databaseSecret: secretsmanager.ISecret;
  private readonly databaseSecurityGroup: ec2.ISecurityGroup;
  private readonly lambdaSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: SSMDatabaseAccessStackProps) {
    super(scope, id, {
      ...props,
      description: 'SSM Session Manager for secure database access - Managed Care Review'
    });
    
    // Store required props
    this.vpc = props.vpc;
    this.databaseCluster = props.databaseCluster;
    this.databaseSecret = props.databaseSecret;
    this.databaseSecurityGroup = props.databaseSecurityGroup;
    this.lambdaSecurityGroup = props.lambdaSecurityGroup;
    
    this.defineResources();
  }

  protected defineResources(): void {

    // Create VPC endpoints for SSM
    this.createVpcEndpoints();

    // Create SSM documents for database connection
    this.createSSMDocuments();

    // Create IAM role for SSM sessions
    this.createSSMRole();

    // Create Lambda function for port forwarding (optional advanced feature)
    // Removed the feature flag check as it doesn't exist in StageConfig

    // Create CloudWatch log group for SSM sessions
    this.createSessionLogging();

    // Create helper SSM parameters
    this.createHelperParameters();

    // Apply CDK Nag suppressions
    // this.applyCdkNagSuppressions();
  }

  /**
   * Create VPC endpoints required for SSM Session Manager
   */
  private createVpcEndpoints(): void {
    const endpointSecurityGroup = new ec2.SecurityGroup(this, 'SSMEndpointSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for SSM VPC endpoints',
      allowAllOutbound: false
    });

    // Allow HTTPS traffic from Lambda and database security groups
    endpointSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(443),
      'HTTPS access from Lambda functions'
    );

    endpointSecurityGroup.addIngressRule(
      this.databaseSecurityGroup,
      ec2.Port.tcp(443),
      'HTTPS access from database security group'
    );

    // SSM endpoint
    const ssmEndpoint = new ec2.InterfaceVpcEndpoint(this, 'SSMEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      subnets: {
        subnets: (this.vpc as any).privateSubnets
      },
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: true
    });

    // SSM Messages endpoint
    const ssmMessagesEndpoint = new ec2.InterfaceVpcEndpoint(this, 'SSMMessagesEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      subnets: {
        subnets: (this.vpc as any).privateSubnets
      },
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: true
    });

    // EC2 Messages endpoint
    const ec2MessagesEndpoint = new ec2.InterfaceVpcEndpoint(this, 'EC2MessagesEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
      subnets: {
        subnets: (this.vpc as any).privateSubnets
      },
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: true
    });

    // CloudWatch Logs endpoint (for session logging)
    const logsEndpoint = new ec2.InterfaceVpcEndpoint(this, 'CloudWatchLogsEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: {
        subnets: (this.vpc as any).privateSubnets
      },
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: true
    });

    // KMS endpoint (for encryption)
    const kmsEndpoint = new ec2.InterfaceVpcEndpoint(this, 'KMSEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.KMS,
      subnets: {
        subnets: (this.vpc as any).privateSubnets
      },
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: true
    });

    this.ssmEndpoints = [ssmEndpoint, ssmMessagesEndpoint, ec2MessagesEndpoint, logsEndpoint, kmsEndpoint];
  }

  /**
   * Create SSM documents for database connections
   */
  private createSSMDocuments(): void {
    // Standard port forwarding document
    this.ssmDocument = new ssm.CfnDocument(this, 'DatabasePortForwardingDocument', {
      documentType: 'Session',
      documentFormat: 'YAML',
      name: `mcr-${this.stage}-db-port-forwarding`,
      content: {
        schemaVersion: '1.0',
        description: 'Port forwarding session to Aurora PostgreSQL database',
        sessionType: 'Port',
        parameters: {
          portNumber: {
            type: 'String',
            description: 'Database port number',
            default: '5432',
            allowedValues: ['5432']
          },
          localPortNumber: {
            type: 'String',
            description: 'Local port to forward to',
            default: '5432',
            allowedPattern: '^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$'
          }
        },
        properties: {
          portNumber: '{{ portNumber }}',
          type: 'LocalPortForwarding',
          localPortNumber: '{{ localPortNumber }}',
          host: this.databaseCluster.clusterEndpoint.hostname
        }
      }
    });

    // Advanced interactive session document
    new ssm.CfnDocument(this, 'DatabaseInteractiveDocument', {
      documentType: 'Session',
      documentFormat: 'YAML',
      name: `mcr-${this.stage}-db-interactive`,
      content: {
        schemaVersion: '1.0',
        description: 'Interactive session with PostgreSQL client tools',
        sessionType: 'InteractiveCommands',
        parameters: {
          commands: {
            type: 'String',
            description: 'Commands to run',
            default: 'psql --version'
          }
        },
        properties: {
          linux: {
            commands: '{{ commands }}',
            runAsElevated: false
          }
        }
      }
    });

    // SQL execution document
    new ssm.CfnDocument(this, 'DatabaseSQLDocument', {
      documentType: 'Command',
      documentFormat: 'YAML',
      name: `mcr-${this.stage}-db-sql-execute`,
      content: {
        schemaVersion: '2.2',
        description: 'Execute SQL commands on Aurora PostgreSQL',
        parameters: {
          database: {
            type: 'String',
            description: 'Database name',
            default: 'postgres'
          },
          sqlCommand: {
            type: 'String',
            description: 'SQL command to execute'
          },
          secretArn: {
            type: 'String',
            description: 'ARN of the database secret',
            default: `arn:aws:secretsmanager:${this.region}:${this.account}:secret:aurora_postgres_${this.stage}_master`
          }
        },
        mainSteps: [
          {
            action: 'aws:runShellScript',
            name: 'executeSql',
            inputs: {
              runCommand: [
                '#!/bin/bash',
                'SECRET=$(aws secretsmanager get-secret-value --secret-id {{ secretArn }} --query SecretString --output text)',
                'HOST=$(echo $SECRET | jq -r .host)',
                'PORT=$(echo $SECRET | jq -r .port)',
                'USERNAME=$(echo $SECRET | jq -r .username)',
                'PASSWORD=$(echo $SECRET | jq -r .password)',
                '',
                'export PGPASSWORD=$PASSWORD',
                'psql -h $HOST -p $PORT -U $USERNAME -d {{ database }} -c "{{ sqlCommand }}"'
              ]
            }
          }
        ]
      }
    });
  }

  /**
   * Create IAM role for SSM sessions
   */
  private createSSMRole(): void {
    this.ssmRole = new iam.Role(this, 'SSMDatabaseAccessRole', {
      roleName: `mcr-${this.stage}-ssm-database-access`,
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('ssm.amazonaws.com'),
        new iam.AccountPrincipal(this.account)
      ),
      // path and permissionsBoundary will be handled by CDK Aspects
      inlinePolicies: {
        DatabaseAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'rds:DescribeDBClusters',
                'rds:DescribeDBInstances'
              ],
              resources: [this.databaseCluster.clusterArn]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret'
              ],
              resources: [this.databaseSecret.secretArn]
            })
          ]
        })
      }
    });
  }

  /**
   * Create Lambda function for port forwarding
   */
  private createPortForwardingLambda(): void {
    // TODO: Implement port forwarding lambda if needed
    // This is an optional advanced feature
  }

  /**
   * Create CloudWatch log group for SSM sessions
   */
  private createSessionLogging(): void {
    new logs.LogGroup(this, 'SSMSessionLogGroup', {
      logGroupName: `/aws/ssm/mcr-${this.stage}-sessions`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY
    });
  }

  /**
   * Create helper SSM parameters
   */
  private createHelperParameters(): void {
    new ssm.StringParameter(this, 'DatabaseEndpoint', {
      parameterName: `/mcr/${this.stage}/database/endpoint`,
      stringValue: this.databaseCluster.clusterEndpoint.hostname,
      description: 'Aurora PostgreSQL cluster endpoint'
    });

    new ssm.StringParameter(this, 'DatabasePort', {
      parameterName: `/mcr/${this.stage}/database/port`,
      stringValue: '5432',
      description: 'Aurora PostgreSQL port'
    });
  }

  /**
   * Apply CDK Nag suppressions
   */
  //   private applyCdkNagSuppressions(): void {
  // CDK Nag suppressions temporarily disabled
  // }
}
