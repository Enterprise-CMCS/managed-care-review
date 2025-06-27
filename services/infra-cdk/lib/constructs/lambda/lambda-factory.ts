import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Duration } from 'aws-cdk-lib';
import { BaseLambdaFunction, BaseLambdaFunctionProps } from './base-lambda-function';
import { OtelLayer } from './otel-layer';
import { StageConfig } from '@config/stage-config';
import { LAMBDA_FUNCTIONS } from '@config/constants';
import { ServiceRegistry } from '@constructs/base';
import { getHandlerMapping, isFunctionMapped, UNMAPPED_FUNCTIONS } from '@config/lambda-handlers';
import { needsPrismaLayer } from './bundling-utils';

export interface LambdaFactoryProps {
  serviceName: string;
  stage: string;
  stageConfig: StageConfig;
  vpc?: ec2.IVpc;
  securityGroups?: ec2.ISecurityGroup[];
  otelLayer: lambda.ILayerVersion;
  prismaLayer?: lambda.ILayerVersion;
  commonEnvironment?: Record<string, string>;
}

export interface CreateFunctionProps {
  functionName: keyof typeof LAMBDA_FUNCTIONS;
  handler?: string; // Optional: override handler from mapping
  environment?: Record<string, string>;
  role?: iam.IRole;
  additionalLayers?: lambda.ILayerVersion[];
  useVpc?: boolean;
  timeout?: Duration;
  memorySize?: number;
  ephemeralStorageSize?: number;
}

/**
 * Factory for creating Lambda functions with consistent configuration
 */
export class LambdaFactory extends Construct {
  private readonly props: LambdaFactoryProps;
  private readonly functions: Map<string, BaseLambdaFunction> = new Map();

  constructor(scope: Construct, id: string, props: LambdaFactoryProps) {
    super(scope, id);
    this.props = props;
  }

  /**
   * Create a Lambda function with standard configuration
   */
  public createFunction(functionProps: CreateFunctionProps): BaseLambdaFunction {
    const functionId = functionProps.functionName;
    
    // Check if function already exists
    if (this.functions.has(functionId)) {
      throw new Error(`Function ${functionId} already exists in this factory`);
    }

    // Get handler mapping
    const handlerMapping = getHandlerMapping(functionProps.functionName);
    
    // Skip unmapped functions with warning
    if (!handlerMapping && !functionProps.handler) {
      console.warn(`⚠️  Skipping function: ${functionProps.functionName} - no handler mapping found`);
      // Create and return a dummy function to avoid breaking references
      return {} as BaseLambdaFunction;
    }

    // Construct handler string from mapping
    const entry = functionProps.handler || handlerMapping?.entry;
    const functionName = handlerMapping?.handler || 'handler';

    if (!entry) {
      throw new Error(`No handler found for function: ${functionProps.functionName}`);
    }

    // Combine entry and function name into standard handler format
    const handler = `${entry}.${functionName}`;

    // Determine if this function needs VPC access
    const needsVpc = functionProps.useVpc ?? this.requiresVpc(functionProps.functionName);

    // Create lambda config with overrides
    const lambdaConfig = {
      ...this.props.stageConfig.lambda,
      ...(functionProps.timeout && { timeout: functionProps.timeout }),
      ...(functionProps.memorySize && { memorySize: functionProps.memorySize }),
      ...(functionProps.ephemeralStorageSize && { ephemeralStorageSize: functionProps.ephemeralStorageSize })
    };

    // Calculate project root for depsLockFilePath
    const projectRoot = path.join(__dirname, '..', '..', '..', '..', '..');

    // Create the function
    const lambdaFunction = new BaseLambdaFunction(this, functionId, {
      functionName: LAMBDA_FUNCTIONS[functionProps.functionName],
      serviceName: this.props.serviceName,
      handler,
      stage: this.props.stage,
      lambdaConfig,
      depsLockFilePath: path.join(projectRoot, 'pnpm-lock.yaml'),
      environment: {
        ...this.props.commonEnvironment,
        ...functionProps.environment
      },
      vpc: needsVpc ? this.props.vpc : undefined,
      vpcSubnets: needsVpc && this.props.vpc ? {
        subnets: (this.props.vpc as any).privateSubnets || []
      } : undefined,
      securityGroups: needsVpc ? this.props.securityGroups : undefined,
      layers: [
        this.props.otelLayer,
        ...(needsPrismaLayer(functionProps.functionName) && this.props.prismaLayer ? [this.props.prismaLayer] : []),
        ...(functionProps.additionalLayers || [])
      ],
      role: functionProps.role,
      logRetentionDays: this.props.stageConfig.monitoring.logRetentionDays
    });

    // Store the function
    this.functions.set(functionId, lambdaFunction);

    // Store function ARN in Parameter Store
    ServiceRegistry.putLambdaArn(
      this,
      this.props.stage,
      LAMBDA_FUNCTIONS[functionProps.functionName],
      lambdaFunction.functionArn
    );

    return lambdaFunction;
  }

  /**
   * Create multiple functions with a common configuration
   */
  public createFunctions(
    functionDefinitions: CreateFunctionProps[]
  ): Map<string, BaseLambdaFunction> {
    const createdFunctions = new Map<string, BaseLambdaFunction>();

    for (const definition of functionDefinitions) {
      const func = this.createFunction(definition);
      createdFunctions.set(definition.functionName, func);
    }

    return createdFunctions;
  }

  /**
   * Get a function that was created by this factory
   */
  public getFunction(functionName: keyof typeof LAMBDA_FUNCTIONS): BaseLambdaFunction | undefined {
    return this.functions.get(functionName);
  }

  /**
   * Get all functions created by this factory
   */
  public getAllFunctions(): Map<string, BaseLambdaFunction> {
    return new Map(this.functions);
  }

  /**
   * Determine if a function requires VPC access based on its purpose
   */
  private requiresVpc(functionName: keyof typeof LAMBDA_FUNCTIONS): boolean {
    // Functions that need database access
    const vpcFunctions: Array<keyof typeof LAMBDA_FUNCTIONS> = [
      'GRAPHQL',
      'OAUTH_TOKEN',
      'MIGRATE',
      'AUDIT_FILES'
    ];

    return vpcFunctions.includes(functionName);
  }

  /**
   * Create a Lambda function from an existing function definition (for migration)
   */
  public static fromExistingFunction(
    scope: Construct,
    id: string,
    functionArn: string
  ): lambda.IFunction {
    return lambda.Function.fromFunctionArn(scope, id, functionArn);
  }
}
