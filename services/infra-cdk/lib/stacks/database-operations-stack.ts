import { BaseStack, BaseStackProps } from '@constructs/base';
import { BaseLambdaFunction } from '@constructs/lambda';
import { S3ScriptUploader } from '@constructs/s3-script-uploader';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Duration, RemovalPolicy, Tags, CfnOutput } from 'aws-cdk-lib';
import { SERVICES, LAMBDA_TIMEOUTS, LAMBDA_MEMORY, SSH_ACCESS_IPS, getAllSshAccessIps, getSshAccessIpv6, SECRETS_MANAGER_DEFAULTS, DATABASE_DEFAULTS, PERMISSION_BOUNDARIES, S3_DEFAULTS, AWS_ACCOUNTS, EXTERNAL_ENDPOINTS, CDK_DEPLOYMENT_SUFFIX, PROJECT_PREFIX } from '@config/constants';
// import { NagSuppressions } from 'cdk-nag';
import * as path from 'path';

export interface DatabaseOperationsStackProps extends BaseStackProps {
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  databaseCluster: rds.IDatabaseCluster;
  databaseSecret: secretsmanager.ISecret;
  uploadsBucketName: string;
  // From Lambda Layers Stack
  /**
   * ARN of the Prisma Engine Lambda layer for database ORM functionality
   */
  prismaEngineLayerArn: string;
  /**
   * ARN of the Prisma Migration Lambda layer for database migrations
   */
  prismaMigrationLayerArn: string;
  /**
   * ARN of the PostgreSQL tools Lambda layer for database operations
   */
  postgresToolsLayerArn: string;
}

/**
 * Database operations stack for rotation, export/import, and management functions
 */
export class DatabaseOperationsStack extends BaseStack {
  public pgToolsLayer: lambda.ILayerVersion;
  public prismaEngineLayer: lambda.ILayerVersion;
  public prismaMigrationLayer: lambda.ILayerVersion;
  public dataExportBucket: s3.IBucket;
  public vmScriptsBucket: s3.IBucket;
  public postgresVm?: ec2.Instance;
  private readonly vpc: ec2.IVpc;
  private readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  private readonly databaseCluster: rds.IDatabaseCluster;
  private readonly databaseSecret: secretsmanager.ISecret;
  private readonly uploadsBucketName: string;
  private readonly prismaEngineLayerArn: string;
  private readonly prismaMigrationLayerArn: string;
  private readonly postgresToolsLayerArn: string;

  constructor(scope: Construct, id: string, props: DatabaseOperationsStackProps) {
    super(scope, id, {
      ...props,
      description: 'Database operations stack for Managed Care Review - Rotation, export/import, and management'
    });
    
    // Store required props
    this.vpc = props.vpc;
    this.lambdaSecurityGroup = props.lambdaSecurityGroup;
    this.databaseCluster = props.databaseCluster;
    this.databaseSecret = props.databaseSecret;
    this.uploadsBucketName = props.uploadsBucketName;
    this.prismaEngineLayerArn = props.prismaEngineLayerArn;
    this.prismaMigrationLayerArn = props.prismaMigrationLayerArn;
    this.postgresToolsLayerArn = props.postgresToolsLayerArn;
    
    // Define resources after all properties are initialized
    this.defineResources();
  }

  protected defineResources(): void {

    // Create Lambda layers
    this.createLambdaLayers();

    // Create S3 buckets
    this.createS3Buckets();

    // Create secret rotation
    this.createSecretRotation();

    // Create database management functions
    this.createDatabaseFunctions();

    // Create VPC endpoint for Secrets Manager
    this.createVpcEndpoint();

    // Create PostgreSQL jumpbox VM (for main/val/prod environments - matches serverless)
    if (this.stage === 'main' || this.stage === 'val' || this.stage === 'prod') {
      this.createPostgresVm();
    }

    // Create cross-account roles for val/prod
    if (this.stage === 'val' || this.stage === 'prod') {
      this.createCrossAccountRoles();
    }
    
    // Create outputs
    this.createOutputs();
  }

  private createLambdaLayers(): void {
    // Import layers from LambdaLayersStack
    this.pgToolsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'ImportedPgToolsLayer',
      this.postgresToolsLayerArn
    );

    // Import Prisma Engine layer
    this.prismaEngineLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'ImportedPrismaEngineLayer',
      this.prismaEngineLayerArn
    );
    
    // Import Prisma Migration layer (separate from engine layer)
    this.prismaMigrationLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'ImportedPrismaMigrationLayer',
      this.prismaMigrationLayerArn
    );
  }

  private createS3Buckets(): void {
    // Data export bucket (for val/prod only)
    if (this.stage === 'val' || this.stage === 'prod') {
      this.dataExportBucket = new s3.Bucket(this, 'DataExportBucket', {
        bucketName: `${SERVICES.POSTGRES}-${this.stage}-data-export${CDK_DEPLOYMENT_SUFFIX}`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        versioned: true,
        lifecycleRules: [{
          id: 'ExpireOldVersions',
          noncurrentVersionExpiration: Duration.days(S3_DEFAULTS.LIFECYCLE.EXPIRE_NONCURRENT_VERSIONS_DAYS),
          enabled: true
        }],
        removalPolicy: this.stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
        enforceSSL: true
      });
    }

    // VM scripts bucket (for main/val/prod environments - matches serverless)
    if (this.stage === 'main' || this.stage === 'val' || this.stage === 'prod') {
      this.vmScriptsBucket = new s3.Bucket(this, 'VmScriptsBucket', {
        bucketName: `${SERVICES.POSTGRES}-${this.stage}-postgres-infra-scripts${CDK_DEPLOYMENT_SUFFIX}`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: RemovalPolicy.DESTROY,
        enforceSSL: true
      });

      // Upload VM scripts to the bucket
      new S3ScriptUploader(this, 'VmScriptUploader', {
        bucket: this.vmScriptsBucket,
        sourceDirectory: path.join(__dirname, '..', '..', 'vm-scripts'),
        destinationKeyPrefix: 'files/'
      });
    }
  }

  private createSecretRotation(): void {
    // Use native CDK secret rotation for PostgreSQL
    if (this.stage !== 'ephemeral' && this.stage !== 'dev') {
      const secretRotation = new secretsmanager.SecretRotation(this, 'SecretRotation', {
        application: secretsmanager.SecretRotationApplication.POSTGRES_ROTATION_SINGLE_USER,
        secret: this.databaseSecret,
        target: this.databaseCluster,
        vpc: this.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        },
        securityGroup: this.lambdaSecurityGroup,
        automaticallyAfter: Duration.days(SECRETS_MANAGER_DEFAULTS.ROTATION_DAYS),
        rotateImmediatelyOnUpdate: true, // Enable immediate rotation on update/import for validation
      });

      // Tag the rotation construct for clarity
      Tags.of(secretRotation).add('Stage', this.stage);
      Tags.of(secretRotation).add('Purpose', 'DatabaseSecretRotation');
      Tags.of(secretRotation).add('Service', 'ManagedCareReview');
      
      // Add CloudWatch monitoring note
      this.node.addMetadata('SecretRotationMonitoring', 
        `Monitor rotation Lambda logs in CloudWatch Logs group: /aws/lambda/SecretsManager-${this.databaseSecret.secretName}-rotation`
      );

      // Apply CDK Nag suppressions for secret rotation Lambda
      // CDK_NAG_DISABLED: NagSuppressions.addResourceSuppressions(
      //   secretRotation,
      //   [
      //     {
      //       id: 'AwsSolutions-IAM4',
      //       reason: 'AWS managed policies are required for Lambda execution and VPC access in secret rotation'
      //     },
      //     {
      //       id: 'AwsSolutions-IAM5',
      //       reason: 'Wildcard permissions are required for secret rotation to access CloudWatch Logs streams'
      //     }
      //   ],
      //   true // Apply to all child resources including the Lambda function and its role
      // );
    }
  }

  private createDatabaseFunctions(): void {
    // Database Manager function
    const dbManagerFunction = new BaseLambdaFunction(this, 'DbManagerFunction', {
      functionName: 'dbManager',
      serviceName: SERVICES.POSTGRES,
      handler: 'logicalDatabaseManager.handler',
      stage: this.stage,
      lambdaConfig: {
        ...this.stageConfig.lambda,
        timeout: LAMBDA_TIMEOUTS.STANDARD
      },
      environment: {
        SECRETS_MANAGER_ENDPOINT: `https://secretsmanager.${this.region}.amazonaws.com`
      },
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [this.lambdaSecurityGroup]
    });

    // Grant permissions for database manager
    this.grantDbManagerPermissions(dbManagerFunction);

    // Database Export function
    const dbExportFunction = new BaseLambdaFunction(this, 'DbExportFunction', {
      functionName: 'dbExport',
      serviceName: SERVICES.POSTGRES,
      handler: 'db_export.handler',
      stage: this.stage,
      lambdaConfig: {
        ...this.stageConfig.lambda,
        timeout: LAMBDA_TIMEOUTS.EXTENDED,
        memorySize: LAMBDA_MEMORY.XLARGE
      },
      environment: {
        S3_BUCKET: this.dataExportBucket?.bucketName || `postgres-${this.stage}-dummy-export`,
        DB_SECRET_ARN: this.databaseSecret.secretArn,
        SECRETS_MANAGER_ENDPOINT: `https://secretsmanager.${this.region}.amazonaws.com`,
        ...(this.stage === 'prod' && {
          VAL_ROLE_ARN: `arn:aws:iam::${AWS_ACCOUNTS.VAL}:role/${SERVICES.POSTGRES}-cross-account-upload-val${CDK_DEPLOYMENT_SUFFIX}`
        })
      },
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [this.lambdaSecurityGroup],
      layers: [this.pgToolsLayer]
    });

    // Create separate role for prod export with cross-account permissions
    if (this.stage === 'prod') {
      this.createProdExportRole(dbExportFunction);
    } else {
      this.grantExportPermissions(dbExportFunction);
    }

    // Database Import function
    const dbImportFunction = new BaseLambdaFunction(this, 'DbImportFunction', {
      functionName: 'dbImport',
      serviceName: SERVICES.POSTGRES,
      handler: 'db_import.handler',
      stage: this.stage,
      lambdaConfig: {
        ...this.stageConfig.lambda,
        timeout: LAMBDA_TIMEOUTS.LONG_RUNNING,
        memorySize: LAMBDA_MEMORY.XLARGE
      },
      environment: {
        S3_BUCKET: this.dataExportBucket?.bucketName || `postgres-${this.stage}-dummy-import`,
        DOCS_S3_BUCKET: this.uploadsBucketName,
        DB_SECRET_ARN: this.databaseSecret.secretArn,
        SECRETS_MANAGER_ENDPOINT: `https://secretsmanager.${this.region}.amazonaws.com`
      },
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [this.lambdaSecurityGroup],
      layers: [this.pgToolsLayer, this.prismaEngineLayer, this.prismaMigrationLayer]
    });

    this.grantImportPermissions(dbImportFunction);
  }

  private createVpcEndpoint(): void {
    // Create VPC endpoint for Secrets Manager
    new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [this.lambdaSecurityGroup],
      privateDnsEnabled: false // Keep as false per user request
    });
  }

  private createPostgresVm(): void {
    // Create security group for VM
    const vmSecurityGroup = new ec2.SecurityGroup(this, 'PostgresVmSecurityGroup', {
      vpc: this.vpc,
      description: 'Enable SSH access via port 22',
      allowAllOutbound: true
    });

    // Add ingress rules for SSH access
    const sshSources = getAllSshAccessIps();

    sshSources.forEach(source => {
      vmSecurityGroup.addIngressRule(
        ec2.Peer.ipv4(source),
        ec2.Port.tcp(22),
        'SSH access'
      );
    });

    // Add IPv6 rules
    const sshIpv6Sources = getSshAccessIpv6();
    sshIpv6Sources.forEach(source => {
      vmSecurityGroup.addIngressRule(
        ec2.Peer.ipv6(source),
        ec2.Port.tcp(22),
        'SSH access IPv6'
      );
    });

    // Create IAM role for VM
    const vmRole = new iam.Role(this, 'PostgresVmRole', {
      roleName: `postgresvm-${this.stage}-ServiceRole${CDK_DEPLOYMENT_SUFFIX}`,
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      path: '/delegatedadmin/developer/',
      permissionsBoundary: iam.ManagedPolicy.fromManagedPolicyArn(
        this,
        'VmPermissionBoundary',
        PERMISSION_BOUNDARIES.POWERUSER(this.account)
      )
    });

    // Grant S3 access to VM scripts bucket
    if (this.vmScriptsBucket) {
      this.vmScriptsBucket.grantReadWrite(vmRole);
    }

    // Create instance
    this.postgresVm = new ec2.Instance(this, 'PostgresVm', {
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.genericLinux({
        'us-east-1': 'ami-05bfc1ab11bfbf484'
      }),
      securityGroup: vmSecurityGroup,
      role: vmRole,
      instanceName: `postgresvm-${this.stage}${CDK_DEPLOYMENT_SUFFIX}`,
      userData: this.getVmUserData()
    });

    // Also add the database security group
    this.postgresVm.addSecurityGroup(this.lambdaSecurityGroup);

    // Tag the instance
    Tags.of(this.postgresVm).add('mcr-vmuse', 'jumpbox');
  }

  private createCrossAccountRoles(): void {
    if (this.stage === 'val') {
      // Create cross-account role for prod to upload to val
      const crossAccountRole = new iam.Role(this, 'CrossAccountUploadRole', {
        roleName: `${SERVICES.POSTGRES}-cross-account-upload-val${CDK_DEPLOYMENT_SUFFIX}`,
        assumedBy: new iam.ArnPrincipal(`arn:aws:iam::${AWS_ACCOUNTS.PROD}:root`)
      });

      // Grant permissions to upload to data export bucket
      if (this.dataExportBucket) {
        this.dataExportBucket.grantWrite(crossAccountRole);
      }

      // Update bucket policy to allow cross-account access
      if (this.dataExportBucket) {
        this.dataExportBucket.addToResourcePolicy(new iam.PolicyStatement({
          sid: 'AllowCrossAccountAccess',
          effect: iam.Effect.ALLOW,
          principals: [crossAccountRole],
          actions: ['s3:PutObject', 's3:PutObjectAcl'],
          resources: [`${this.dataExportBucket.bucketArn}/*`]
        }));
      }
    }
  }

  private grantDbManagerPermissions(func: BaseLambdaFunction): void {
    // Grant secret management permissions
    (func.role as iam.Role).addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:DescribeSecret',
        'secretsmanager:GetSecretValue'
      ],
      resources: [this.databaseSecret.secretArn]
    }));

    (func.role as iam.Role).addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:DescribeSecret',
        'secretsmanager:GetSecretValue',
        'secretsmanager:PutSecretValue',
        'secretsmanager:UpdateSecretVersionStage',
        'secretsmanager:DeleteSecret'
      ],
      resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:aurora_${SERVICES.POSTGRES}_*`]
    }));
  }

  private grantExportPermissions(func: BaseLambdaFunction): void {
    // Grant database secret access
    this.databaseSecret.grantRead(func.function);

    // Grant S3 permissions
    if (this.dataExportBucket) {
      this.dataExportBucket.grantWrite(func.function);
    }
  }

  private grantImportPermissions(func: BaseLambdaFunction): void {
    // Grant database secret access
    this.databaseSecret.grantRead(func.function);

    // Grant S3 permissions
    if (this.dataExportBucket) {
      this.dataExportBucket.grantRead(func.function);
    }

    // Grant access to uploads bucket
    const uploadsBucket = s3.Bucket.fromBucketName(
      this,
      'UploadsBucket',
      this.uploadsBucketName
    );
    uploadsBucket.grantRead(func.function);
  }

  private createProdExportRole(func: BaseLambdaFunction): void {
    // Create custom role for prod export with cross-account permissions
    const prodExportRole = new iam.Role(this, 'ProdExportRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      path: '/delegatedadmin/developer/',
      permissionsBoundary: iam.ManagedPolicy.fromManagedPolicyArn(
        this,
        'ProdExportPermissionBoundary',
        PERMISSION_BOUNDARIES.POWERUSER(this.account)
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ]
    });

    // Grant cross-account assume role permission
    prodExportRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sts:AssumeRole'],
      resources: [`arn:aws:iam::${AWS_ACCOUNTS.VAL}:role/${SERVICES.POSTGRES}-cross-account-upload-val${CDK_DEPLOYMENT_SUFFIX}`]
    }));

    // Replace the function's role
    (func.function.node.defaultChild as lambda.CfnFunction).role = prodExportRole.roleArn;
  }

  private getVmUserData(): ec2.UserData {
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      '# get apt data for postgres-14',
      'sh -c \'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list\'',
      'wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -',
      '',
      'apt update && apt install unzip postgresql-14 postgresql-contrib -y',
      'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip',
      './aws/install',
      '',
      '# Download VM scripts from S3',
      'copy_files_from_s3() {',
      `  aws s3 cp s3://${this.vmScriptsBucket?.bucketName}/files/vm-startup.sh /usr/local/bin/vm-startup.sh`,
      `  aws s3 cp s3://${this.vmScriptsBucket?.bucketName}/files/vm-shutdown.sh /usr/local/bin/vm-shutdown.sh`,
      `  aws s3 cp s3://${this.vmScriptsBucket?.bucketName}/files/slack-notify.service /etc/systemd/system/notify-slack.service`,
      `  aws s3 cp s3://${this.vmScriptsBucket?.bucketName}/files/authorized_keys /home/ubuntu/.ssh/authorized_keys`,
      '}',
      '',
      'download_failures=0',
      'while true; do',
      '  copy_files_from_s3',
      '  exit_code=$?',
      '',
      '  if [ $exit_code -eq 0 ]; then',
      '    echo "Downloaded vm scripts from s3 successfully"',
      '    break',
      '  else',
      '    echo "Failed to download vm scripts from s3. Retrying in 10 seconds..."',
      '    download_failures=$((download_failures+1))',
      '',
      '    if [ $download_failures -eq 60 ]; then',
      '      echo "Maximum attempts of aws s3 cp reached. Exiting..."',
      '      break',
      '    fi',
      '',
      '    sleep 10',
      '  fi',
      'done',
      '',
      'chmod +x /usr/local/bin/vm-startup.sh',
      'chmod +x /usr/local/bin/vm-shutdown.sh',
      'chmod +x /etc/systemd/system/notify-slack.service',
      '',
      'chmod 600 /home/ubuntu/.ssh/authorized_keys',
      'chown ubuntu:ubuntu /home/ubuntu/.ssh/authorized_keys',
      '',
      `sed -i "s,SLACK_WEBHOOK,${EXTERNAL_ENDPOINTS.SLACK_WEBHOOK},g" /usr/local/bin/vm-startup.sh`,
      `sed -i "s,SLACK_WEBHOOK,${EXTERNAL_ENDPOINTS.SLACK_WEBHOOK},g" /usr/local/bin/vm-shutdown.sh`,
      `sed -i "s,STAGE,${this.stage},g" /usr/local/bin/vm-startup.sh`,
      `sed -i "s,STAGE,${this.stage},g" /usr/local/bin/vm-shutdown.sh`,
      'systemctl start notify-slack',
      'systemctl enable notify-slack'
    );
    
    return userData;
  }

  /**
   * Create stack outputs
   */
  private createOutputs(): void {
    // Layer outputs are now handled by LambdaLayersStack
    // This stack imports the layers instead of creating them
  }


}
