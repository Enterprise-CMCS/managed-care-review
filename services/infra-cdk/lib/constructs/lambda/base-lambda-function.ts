import { Construct } from 'constructs';
import { NodejsFunction, NodejsFunctionProps, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Duration } from 'aws-cdk-lib';
import { LambdaConfig } from '@config/stage-config';
import { DEFAULTS, ResourceNames } from '@config/constants';
// import { NagSuppressions } from 'cdk-nag';
import * as path from 'path';
import { getBundlingConfig } from './bundling-utils';

export interface BaseLambdaFunctionProps {
  functionName: string;
  serviceName: string;
  handler: string; // Format: "filename.exportedFunction" e.g., "logicalDatabaseManager.handler"
  stage: string;
  lambdaConfig: LambdaConfig;
  environment?: Record<string, string>;
  vpc?: ec2.IVpc;
  vpcSubnets?: ec2.SubnetSelection;
  securityGroups?: ec2.ISecurityGroup[];
  deadLetterQueue?: sqs.IQueue;
  role?: iam.IRole;
  bundling?: NodejsFunctionProps['bundling'];
  logRetentionDays?: number;
  depsLockFilePath?: string;
  layers?: lambda.ILayerVersion[];
  hasOtelLayer?: boolean; // Whether this function has the OTEL layer for telemetry
}

/**
 * Base Lambda function construct with standard configuration
 */
export class BaseLambdaFunction extends Construct {
  public readonly function: NodejsFunction;
  public readonly logGroup: logs.LogGroup;
  public readonly role: iam.IRole;

  constructor(scope: Construct, id: string, props: BaseLambdaFunctionProps) {
    super(scope, id);

    // Create or use provided role
    this.role = props.role || this.createLambdaRole(props);

    // Create log group with retention
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/cdk-${ResourceNames.resourceName(props.serviceName, props.functionName, props.stage)}`,
      retention: props.logRetentionDays || 7
    });

    // Parse handler to extract entry file and handler function
    const handlerParts = props.handler.split('.');
    const entryFile = handlerParts[0];
    const handlerFunction = handlerParts[1] || 'handler';

    // Create the Lambda function
    this.function = new NodejsFunction(this, 'Function', {
      functionName: ResourceNames.resourceName(props.serviceName, props.functionName, props.stage),
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: props.lambdaConfig.architecture === 'arm64' 
        ? lambda.Architecture.ARM_64 
        : lambda.Architecture.X86_64,
      handler: handlerFunction,
      entry: path.join('..', props.serviceName, 'src', `${entryFile}.ts`),
      memorySize: props.lambdaConfig.memorySize,
      timeout: props.lambdaConfig.timeout,
      tracing: lambda.Tracing.ACTIVE,
      role: this.role,
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: props.securityGroups,
      reservedConcurrentExecutions: props.lambdaConfig.reservedConcurrentExecutions,
      depsLockFilePath: props.depsLockFilePath,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        // OTEL configuration - only if function has OTEL layer
        ...(props.hasOtelLayer && {
          AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
          OTEL_PROPAGATORS: 'tracecontext,baggage,xray',
          OTEL_PYTHON_DISABLED_INSTRUMENTATIONS: 'urllib3',
        }),
        // Service configuration
        SERVICE_NAME: props.serviceName,
        METRICS_NAMESPACE: DEFAULTS.METRICS_NAMESPACE,
        LOG_LEVEL: props.stage === 'prod' ? 'INFO' : 'DEBUG',
        STAGE: props.stage,
        ...props.environment
      },
      bundling: props.bundling || getBundlingConfig(
        props.functionName,
        props.stage,
        props.lambdaConfig.architecture === 'arm64' 
          ? lambda.Architecture.ARM_64 
          : lambda.Architecture.X86_64
      ),
      layers: props.layers,
      deadLetterQueue: props.deadLetterQueue,
      logGroup: this.logGroup
    });

    // Add provisioned concurrency for production if specified
    if (props.stage === 'prod' && props.lambdaConfig.provisionedConcurrentExecutions) {
      const version = this.function.currentVersion;
      const alias = new lambda.Alias(this, 'ProvisionedAlias', {
        aliasName: 'provisioned',
        version,
        provisionedConcurrentExecutions: props.lambdaConfig.provisionedConcurrentExecutions
      });
    }

    // Apply CDK Nag suppressions
    this.applyCdkNagSuppressions();
  }

  /**
   * Create a Lambda execution role with basic permissions
   */
  private createLambdaRole(props: BaseLambdaFunctionProps): iam.Role {
    const role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `Execution role for ${props.functionName} Lambda function`,
      roleName: ResourceNames.resourceName(props.serviceName, `${props.functionName}-role`, props.stage),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    // Add VPC permissions if Lambda is in VPC
    if (props.vpc) {
      role.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      );
    }

    // Add X-Ray permissions for tracing
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess')
    );

    return role;
  }

  /**
   * Apply CDK Nag suppressions for common Lambda patterns
   */
  private applyCdkNagSuppressions(): void {
    // CDK Nag suppressions temporarily disabled
  }

  /**
   * Grant permissions to invoke this function
   */
  public grantInvoke(grantee: iam.IGrantable): iam.Grant {
    return this.function.grantInvoke(grantee);
  }

  /**
   * Add environment variables to the function
   */
  public addEnvironment(key: string, value: string): void {
    this.function.addEnvironment(key, value);
  }

  /**
   * Add an event source to the function
   */
  public addEventSource(eventSource: lambda.IEventSource): void {
    this.function.addEventSource(eventSource);
  }

  /**
   * Get the function ARN
   */
  public get functionArn(): string {
    return this.function.functionArn;
  }

  /**
   * Get the function name
   */
  public get functionName(): string {
    return this.function.functionName;
  }
}
