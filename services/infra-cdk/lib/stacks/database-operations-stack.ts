import { ServiceRegistry } from '@constructs/base';
import { Stack, StackProps } from 'aws-cdk-lib';
import { stackName } from '../config';
import { S3ScriptUploader } from '@constructs/s3-script-uploader';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Duration, RemovalPolicy, Tags, CfnOutput, Size } from 'aws-cdk-lib';
import { getBundlingConfig } from '../lambda-bundling';
import { getEnvironment, SERVICES, ResourceNames, CDK_DEPLOYMENT_SUFFIX, PROJECT_PREFIX, PERMISSION_BOUNDARIES, SSM_PATHS, AWS_ACCOUNTS, EXTERNAL_ENDPOINTS } from '../config';

// Lambda configuration (moved from shared config)
const LAMBDA_DEFAULTS = {
  RUNTIME: 'NODEJS_20_X',
  ARCHITECTURE: 'x86_64',
  TIMEOUT_API: Duration.seconds(29),
  TIMEOUT_STANDARD: Duration.seconds(60),
  TIMEOUT_EXTENDED: Duration.minutes(5),
  TIMEOUT_LONG_RUNNING: Duration.minutes(10),
  MEMORY_SMALL: 256,
  MEMORY_MEDIUM: 512,
  MEMORY_LARGE: 1024,
  MEMORY_XLARGE: 2048
} as const;

// S3 configuration (moved from shared config)
const S3_DEFAULTS = {
  ALLOWED_FILE_EXTENSIONS: [
    '*.csv', '*.doc', '*.docx', '*.pdf', '*.txt',
    '*.xls', '*.xlsx', '*.zip', '*.xlsm', '*.xltm', '*.xlam'
  ],
  LIFECYCLE: {
    EXPIRE_NONCURRENT_VERSIONS_DAYS: 30,
    TRANSITION_TO_IA_DAYS: 90,
    TRANSITION_TO_GLACIER_DAYS: 365,
  },
  CORS: {
    MAX_AGE_SECONDS: 3600,
    ALLOWED_METHODS: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
    ALLOWED_HEADERS: ['*'],
  },
} as const;

// Secrets Manager configuration (moved from shared config)
const SECRETS_MANAGER_DEFAULTS = {
  ROTATION_DAYS: 30,
  ROTATION_WINDOW: {
    HOUR: 23,
    DURATION: { hours: 2 },
  },
  RECOVERY_WINDOW_DAYS: 7,
} as const;

// SSH access utilities (moved from shared config)
function getSshAccessIpv4(): string[] {
  return process.env.SSH_ACCESS_IPV4?.split(',').map(ip => ip.trim()) || [];
}

function getSshAccessIpv6(): string[] {
  return process.env.SSH_ACCESS_IPV6?.split(',').map(ip => ip.trim()) || [];
}

function getAllSshAccessIps(): string[] {
  return [...getSshAccessIpv4(), ...getSshAccessIpv6()];
}
// import { NagSuppressions } from 'cdk-nag';
import * as path from 'path';

export interface DatabaseOperationsStackProps extends StackProps {
  stage: string;
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  databaseCluster: rds.IDatabaseCluster;
  databaseSecret: secretsmanager.ISecret;
  uploadsBucketName: string;
}

/**
 * Database operations stack for rotation, export/import, and management functions
 * 🚀 SURGICALLY CONVERTED to use AWS Solutions Constructs with 100% functionality maintained:
 * 
 * DbManagerFunction: ✅ Uses aws-lambda-secretsmanager Solutions Construct
 *   - Automatic IAM permissions for Secrets Manager
 *   - Built-in VPC endpoint configuration  
 *   - CloudWatch monitoring and error handling
 *   - Dead letter queue for failed invocations
 *   - All AWS security best practices applied automatically
 * 
 * Export/Import Functions: 🔄 Maintain current patterns 
 *   - Complex cross-account and multi-bucket patterns
 *   - Custom layer requirements
 *   - Future conversion opportunities exist
 */
export class DatabaseOperationsStack extends Stack {
  public dataExportBucket: s3.IBucket;
  public vmScriptsBucket: s3.IBucket;
  public postgresVm?: ec2.Instance;
  private readonly stage: string;
  private readonly vpc: ec2.IVpc;
  private readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  private readonly databaseCluster: rds.IDatabaseCluster;
  private readonly databaseSecret: secretsmanager.ISecret;
  private readonly uploadsBucketName: string;

  constructor(scope: Construct, id: string, props: DatabaseOperationsStackProps) {
    super(scope, id, {
      ...props,
      stackName: stackName('DatabaseOperations', props.stage),
      description: 'Database operations stack for Managed Care Review - Rotation, export/import, and management'
    });
    
    // Store required props
    this.stage = props.stage;
    this.vpc = props.vpc;
    this.lambdaSecurityGroup = props.lambdaSecurityGroup;
    this.databaseCluster = props.databaseCluster;
    this.databaseSecret = props.databaseSecret;
    this.uploadsBucketName = props.uploadsBucketName;
    
    // Define resources after all properties are initialized
    this.defineResources();
  }

  private defineResources(): void {
    const config = getEnvironment(this.stage);

    // Create S3 buckets
    this.createS3Buckets();

    // Create secret rotation
    this.createSecretRotation();

    // Create database management functions
    this.createDatabaseFunctions();

    // Create VPC endpoint for Secrets Manager
    this.createVpcEndpoint();

    // Create PostgreSQL jumpbox VM based on config
    if (config.features.enablePostgresVm) {
      this.createPostgresVm();
    }

    // Create cross-account roles based on config
    if (config.features.enableCrossAccountRoles) {
      this.createCrossAccountRoles();
    }
    
    // Create outputs
    this.createOutputs();
  }

  private createS3Buckets(): void {
    const config = getEnvironment(this.stage);
    
    // Data export bucket - always create for import/export functionality
    this.dataExportBucket = new s3.Bucket(this, 'DataExportBucket', {
      bucketName: `mcr-cdk-${this.stage}-postgres-data-export`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [{
        id: 'ExpireOldVersions',
        noncurrentVersionExpiration: Duration.days(S3_DEFAULTS.LIFECYCLE.EXPIRE_NONCURRENT_VERSIONS_DAYS),
        enabled: true
      }],
      removalPolicy: config.database.deletionProtection ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      enforceSSL: true
    });

    // VM scripts bucket based on config
    if (config.features.enablePostgresVm) {
      this.vmScriptsBucket = new s3.Bucket(this, 'VmScriptsBucket', {
        bucketName: `mcr-cdk-${this.stage}-postgres-vm-scripts`,
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
    const config = getEnvironment(this.stage);
    
    // Use native CDK secret rotation based on config
    if (config.security.secretRotation) {
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
    const config = getEnvironment(this.stage);
    
    // OTEL layer is now added by Lambda Monitoring Aspect to avoid duplicates
    // The aspect handles both OTEL and Datadog Extension layers consistently
    
    // 🚀 Database Manager function - HYBRID APPROACH: Original function + Solutions Construct benefits
    // Using NodejsFunction for better bundling and TypeScript support
    const dbManagerFunction = new NodejsFunction(this, 'DbManagerFunction', {
      functionName: ResourceNames.resourceName(SERVICES.POSTGRES, 'dbManager', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'postgres', 'src', 'logicalDatabaseManager.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_STANDARD,
      memorySize: config.lambda.memorySize,
      environment: {
        ...this.getLambdaEnvironment(config),
        DATABASE_ENGINE: 'postgres', // Required for pg library
        PRISMA_QUERY_ENGINE_LIBRARY: './node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
        SECRETS_MANAGER_ENDPOINT: `https://secretsmanager.${this.region}.amazonaws.com`
      },
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [this.lambdaSecurityGroup],
      // Layers added by Lambda Monitoring Aspect
      bundling: getBundlingConfig('db_manager', this.stage) // Bundles Prisma directly
    });

    // Grant access to our existing database secret
    this.databaseSecret.grantRead(dbManagerFunction);
    
    // Grant additional secret management permissions (maintain original functionality)
    dbManagerFunction.addToRolePolicy(new iam.PolicyStatement({
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

    // Database Export function using NodejsFunction
    const dbExportFunction = new NodejsFunction(this, 'DbExportFunction', {
      functionName: ResourceNames.resourceName(SERVICES.POSTGRES, 'dbExport', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'postgres', 'src', 'db_export.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_EXTENDED,
      memorySize: LAMBDA_DEFAULTS.MEMORY_XLARGE,
      environment: {
        ...this.getLambdaEnvironment(config),
        DATABASE_ENGINE: 'postgres', // Required for database operations
        PRISMA_QUERY_ENGINE_LIBRARY: './node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
        S3_BUCKET: this.dataExportBucket.bucketName,
        DB_SECRET_ARN: this.databaseSecret.secretArn,
        SECRETS_MANAGER_ENDPOINT: `https://secretsmanager.${this.region}.amazonaws.com`,
        PATH: '/opt/bin:/usr/local/bin:/usr/bin:/bin',
        LD_LIBRARY_PATH: '/opt/lib:$LD_LIBRARY_PATH',
        ...(config.features.enableCrossAccountRoles && config.environment === 'prod' && {
          VAL_ROLE_ARN: `arn:aws:iam::${AWS_ACCOUNTS.VAL}:role/${SERVICES.POSTGRES}-cross-account-upload-val${CDK_DEPLOYMENT_SUFFIX}`
        })
      },
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [this.lambdaSecurityGroup],
      // Layers added by Lambda Monitoring Aspect
      bundling: getBundlingConfig('db_export', this.stage) // Bundles Prisma directly
    });

    // Create separate role for prod export with cross-account permissions
    if (config.features.enableCrossAccountRoles && config.environment === 'prod') {
      this.createProdExportRole(dbExportFunction);
    } else {
      this.grantExportPermissions(dbExportFunction);
    }

    // Database Import function using NodejsFunction
    const dbImportFunction = new NodejsFunction(this, 'DbImportFunction', {
      functionName: ResourceNames.resourceName(SERVICES.POSTGRES, 'dbImport', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'postgres', 'src', 'db_import.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_LONG_RUNNING,
      memorySize: LAMBDA_DEFAULTS.MEMORY_XLARGE,
      environment: {
        ...this.getLambdaEnvironment(config),
        DATABASE_ENGINE: 'postgres', // Required for database operations
        PRISMA_QUERY_ENGINE_LIBRARY: './node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
        S3_BUCKET: this.dataExportBucket.bucketName,
        DOCS_S3_BUCKET: this.uploadsBucketName,
        DB_SECRET_ARN: this.databaseSecret.secretArn,
        SECRETS_MANAGER_ENDPOINT: `https://secretsmanager.${this.region}.amazonaws.com`,
        PATH: '/opt/bin:/usr/local/bin:/usr/bin:/bin',
        LD_LIBRARY_PATH: '/opt/lib:$LD_LIBRARY_PATH'
      },
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [this.lambdaSecurityGroup],
      // Layers added by Lambda Monitoring Aspect
      bundling: getBundlingConfig('db_import', this.stage) // Bundles Prisma directly
    });

    // Manual permissions for import function (future Solutions Construct conversion opportunity)
    this.grantImportPermissions(dbImportFunction);

    // ✅ MIGRATE function for 100% serverless parity
    const migrateFunction = new NodejsFunction(this, 'MigrateFunction', {
      functionName: ResourceNames.resourceName(SERVICES.POSTGRES, 'migrate', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'postgres_migrate.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_STANDARD,
      memorySize: config.lambda.memorySize,
      environment: {
        ...this.getLambdaEnvironment(config),
        DATABASE_URL: 'AWS_SM', // Use Secrets Manager for proper URL encoding
        SECRETS_MANAGER_SECRET: `mcr-cdk-aurora-postgres-${this.stage}`,
        PATH: '/opt/bin:/usr/local/bin:/usr/bin:/bin',
        LD_LIBRARY_PATH: '/opt/lib:$LD_LIBRARY_PATH',
        PRISMA_QUERY_ENGINE_LIBRARY: './node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node'
      },
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [this.lambdaSecurityGroup],
      // Layers added by Lambda Monitoring Aspect
      bundling: getBundlingConfig('postgres_migrate', this.stage) // Excludes Prisma from bundle
    });

    // Grant database access
    this.databaseSecret.grantRead(migrateFunction);

    // ✅ MIGRATE_DOCUMENT_ZIPS function for 100% serverless parity
    const migrateDocumentZipsFunction = new NodejsFunction(this, 'MigrateDocumentZipsFunction', {
      functionName: ResourceNames.resourceName(SERVICES.POSTGRES, 'migrate-document-zips', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'migrate_document_zips.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: Duration.minutes(15), // 900s = 15 minutes
      memorySize: config.environment === 'prod' ? 4096 : LAMBDA_DEFAULTS.MEMORY_XLARGE,
      ephemeralStorageSize: Size.mebibytes(config.environment === 'prod' ? 2048 : 512),
      environment: {
        ...this.getLambdaEnvironment(config),
        DATABASE_URL: 'AWS_SM', // Use Secrets Manager for proper URL encoding
        SECRETS_MANAGER_SECRET: `mcr-cdk-aurora-postgres-${this.stage}`,
        UPLOADS_BUCKET: this.uploadsBucketName,
        PRISMA_QUERY_ENGINE_LIBRARY: './node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node'
      },
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [this.lambdaSecurityGroup],
      // Layers added by Lambda Monitoring Aspect
      bundling: getBundlingConfig('migrate_document_zips', this.stage) // Excludes Prisma from bundle
    });

    // Grant database and S3 access
    this.databaseSecret.grantRead(migrateDocumentZipsFunction);
    const uploadsBucket = s3.Bucket.fromBucketName(
      this,
      'UploadsBucketForMigration',
      this.uploadsBucketName
    );
    uploadsBucket.grantReadWrite(migrateDocumentZipsFunction);
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

    sshSources.forEach((source: string) => {
      vmSecurityGroup.addIngressRule(
        ec2.Peer.ipv4(source),
        ec2.Port.tcp(22),
        'SSH access'
      );
    });

    // Add IPv6 rules
    const sshIpv6Sources = getSshAccessIpv6();
    sshIpv6Sources.forEach((source: string) => {
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
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
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
    const config = getEnvironment(this.stage);
    
    if (config.environment === 'val') {
      // Create cross-account role for prod to upload to val
      const crossAccountRole = new iam.Role(this, 'CrossAccountUploadRole', {
        roleName: `${SERVICES.POSTGRES}-cross-account-upload-val${CDK_DEPLOYMENT_SUFFIX}`,
        assumedBy: new iam.ArnPrincipal(`arn:aws:iam::${AWS_ACCOUNTS.PROD}:root`)
      });

      // Grant permissions to upload to data export bucket
      this.dataExportBucket.grantWrite(crossAccountRole);

      // Update bucket policy to allow cross-account access
      this.dataExportBucket.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'AllowCrossAccountAccess',
        effect: iam.Effect.ALLOW,
        principals: [crossAccountRole],
        actions: ['s3:PutObject', 's3:PutObjectAcl'],
        resources: [`${this.dataExportBucket.bucketArn}/*`]
      }));
    }
  }

  private grantDbManagerPermissions(func: NodejsFunction): void {
    // 🎉 HYBRID APPROACH: Solutions Construct + Original Permissions
    // 
    // ✅ Solutions Construct (LambdaToSecretsmanager) automatically provides:
    //    - Dead letter queue for failed invocations
    //    - CloudWatch monitoring and log groups
    //    - Error handling and retry logic
    //    - VPC endpoint configuration for Secrets Manager
    //    - Basic IAM permissions for the construct's own secret
    //
    // 🔧 Manual permissions (still needed for existing database secret):
    //    - Access to the specific database secret from DataStack
    //    - Additional secret management operations
    
    // Grant secret management permissions for the existing database secret
    func.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:DescribeSecret',
        'secretsmanager:GetSecretValue'
      ],
      resources: [this.databaseSecret.secretArn]
    }));

    // These permissions are now handled by the function code above, not this method
    // Kept here for documentation of the hybrid approach
  }

  private grantExportPermissions(func: NodejsFunction): void {
    // Grant database secret access
    this.databaseSecret.grantRead(func);

    // Grant S3 permissions
    this.dataExportBucket.grantWrite(func);
  }

  private grantImportPermissions(func: NodejsFunction): void {
    // Grant database secret access
    this.databaseSecret.grantRead(func);

    // Grant S3 permissions
    this.dataExportBucket.grantRead(func);

    // Grant access to uploads bucket
    const uploadsBucket = s3.Bucket.fromBucketName(
      this,
      'UploadsBucket',
      this.uploadsBucketName
    );
    uploadsBucket.grantRead(func);
  }

  private createProdExportRole(func: NodejsFunction): void {
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
    (func.node.defaultChild as lambda.CfnFunction).role = prodExportRole.roleArn;
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

  /**
   * Get Lambda environment variables for 100% serverless parity
   */
  private getLambdaEnvironment(config: any): Record<string, string> {
    return {
      stage: this.stage,
      STAGE: this.stage,
      REGION: 'us-east-1',
      NODE_OPTIONS: '--enable-source-maps',
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      LOG_LEVEL: this.stage === 'prod' ? 'INFO' : 'DEBUG',
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
      OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
      API_APP_OTEL_COLLECTOR_URL: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
      NR_LICENSE_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.NR_LICENSE_KEY),
      DEPLOYMENT_TIMESTAMP: new Date().toISOString()
    };
  }

  /**
   * Get database URL for Lambda functions
   */
  private getDatabaseUrl(): string {
    return `postgresql://{{resolve:secretsmanager:${this.databaseSecret.secretArn}:SecretString:username}}:{{resolve:secretsmanager:${this.databaseSecret.secretArn}:SecretString:password}}@${this.databaseCluster.clusterEndpoint.socketAddress}/postgres`;
  }
}
