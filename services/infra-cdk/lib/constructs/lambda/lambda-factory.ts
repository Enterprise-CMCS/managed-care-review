import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Duration } from 'aws-cdk-lib';
import { BaseLambdaFunction, BaseLambdaFunctionProps } from './base-lambda-function';
import { OtelLayer } from './otel-layer';
import { StageConfig } from '@config/index';
import { LAMBDA_FUNCTIONS } from '@config/index';
import { ServiceRegistry } from '@constructs/base';
import { getPrismaLayerType, PrismaLayerType } from './bundling-utils';

interface HandlerMapping {
  entry: string;
  handler: string;
  functionName?: string; // For functions where CDK name differs from serverless
}

/**
 * Handler mappings for functions that exist in serverless.yml
 */
const HANDLER_MAP: Record<string, HandlerMapping> = {
  // Main GraphQL API
  GRAPHQL: { 
    entry: 'src/handlers/apollo_gql', 
    handler: 'gqlHandler',
    functionName: 'graphql'
  },
  
  // Email functions
  EMAIL_SUBMIT: { 
    entry: 'src/handlers/email_submit', 
    handler: 'main',
    functionName: 'email_submit'
  },
  
  // Auth functions
  OAUTH_TOKEN: { 
    entry: 'src/handlers/oauth_token', 
    handler: 'main',
    functionName: 'oauth_token'
  },
  
  // Health check
  HEALTH: { 
    entry: 'src/handlers/health_check', 
    handler: 'main',
    functionName: 'health'
  },
  INDEX_HEALTH_CHECKER: {
    entry: 'src/handlers/health_check',
    handler: 'main',
    functionName: 'health'
  },
  
  // Authorizer
  THIRD_PARTY_API_AUTHORIZER: { 
    entry: 'src/handlers/third_party_API_authorizer', 
    handler: 'main',
    functionName: 'third_party_api_authorizer'
  },
  
  // Observability
  OTEL: { 
    entry: 'src/handlers/otel_proxy', 
    handler: 'main',
    functionName: 'otel'
  },
  
  // Database operations
  MIGRATE: { 
    entry: 'src/handlers/postgres_migrate', 
    handler: 'main',
    functionName: 'migrate'
  },
  MIGRATE_DOCUMENT_ZIPS: {
    entry: 'src/handlers/migrate_document_zips',
    handler: 'main',
    functionName: 'migrate_document_zips'
  },
  
  // File operations
  ZIP_KEYS: { 
    entry: 'src/handlers/bulk_download', 
    handler: 'main',
    functionName: 'zip_keys'
  },
  
  // Cleanup
  CLEANUP: { 
    entry: 'src/handlers/cleanup', 
    handler: 'main',
    functionName: 'cleanup'
  },
  
  // S3 audit
  AUDIT_FILES: { 
    entry: 'src/handlers/audit_s3', 
    handler: 'main',
    functionName: 'auditFiles'
  }
};

export interface LambdaFactoryProps {
  serviceName: string;
  stage: string;
  stageConfig: StageConfig;
  vpc?: ec2.IVpc;
  securityGroups?: ec2.ISecurityGroup[];
  otelLayer: lambda.ILayerVersion;
  prismaEngineLayer?: lambda.ILayerVersion;
  prismaMigrationLayer?: lambda.ILayerVersion;
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
  
  /**
   * Functions that should NOT have any layers applied (matching serverless.yml)
   * Updated based on serverless.yml analysis: ALL functions have OTEL layers
   */
  private readonly FUNCTIONS_WITHOUT_LAYERS: Array<keyof typeof LAMBDA_FUNCTIONS> = [
    // All functions in serverless.yml have OTEL layers - no exclusions needed
  ];

  constructor(scope: Construct, id: string, props: LambdaFactoryProps) {
    super(scope, id);
    this.props = props;
    
    // Validate layer configuration on construction
    this.validateLayerConfiguration();
  }

  /**
   * Create a Lambda function with standard configuration
   * 
   * Layer application logic:
   * - All functions get OTEL layer (required for observability)
   * - Functions get Prisma Engine OR Migration layer based on getPrismaLayerType(), never both
   * - Additional layers can be added via additionalLayers parameter
   */
  public createFunction(functionProps: CreateFunctionProps): BaseLambdaFunction {
    const functionId = functionProps.functionName;
    
    // Check if function already exists
    if (this.functions.has(functionId)) {
      throw new Error(`Function ${functionId} already exists in this factory`);
    }

    // Get handler mapping
    const handlerMapping = HANDLER_MAP[functionProps.functionName];
    
    // Skip unmapped functions with error
    if (!handlerMapping && !functionProps.handler) {
      throw new Error(
        `Function ${functionProps.functionName} has no handler mapping. ` +
        `Add mapping to HANDLER_MAP or provide explicit handler.`
      );
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
      layers: this.getLayersForFunction(functionProps),
      role: functionProps.role,
      logRetentionDays: this.props.stageConfig.monitoring.logRetentionDays,
      hasOtelLayer: true // All functions have OTEL layers per serverless.yml analysis
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
   * Get the appropriate layers for a function based on its requirements
   * Functions in FUNCTIONS_WITHOUT_LAYERS get no layers at all (matching serverless.yml)
   */
  private getLayersForFunction(functionProps: CreateFunctionProps): lambda.ILayerVersion[] {
    // Check if this function should have no layers
    if (this.FUNCTIONS_WITHOUT_LAYERS.includes(functionProps.functionName)) {
      return [];
    }
    
    // Otherwise, apply standard layer configuration
    return [
      // Order matters: OTEL first, then Prisma, then additional
      this.props.otelLayer,
      ...this.getPrismaLayers(functionProps.functionName),
      ...(functionProps.additionalLayers || [])
    ];
  }

  /**
   * Get the appropriate Prisma layers for a function
   */
  private getPrismaLayers(functionName: string): lambda.ILayerVersion[] {
    const layerType = getPrismaLayerType(functionName);
    
    switch (layerType) {
      case PrismaLayerType.ENGINE:
        return this.props.prismaEngineLayer ? [this.props.prismaEngineLayer] : [];
      case PrismaLayerType.MIGRATION:
        return this.props.prismaMigrationLayer ? [this.props.prismaMigrationLayer] : [];
      case PrismaLayerType.NONE:
        return [];
    }
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
   * Validate layer configuration to ensure required layers are present
   * and there are no conflicting configurations
   */
  private validateLayerConfiguration(): void {
    // OTEL layer is required for all functions
    if (!this.props.otelLayer) {
      throw new Error(
        'OTEL layer is required but not provided. ' +
        'All Lambda functions must have the OTEL layer for observability. ' +
        'Please ensure the otelLayer is properly configured in the LambdaFactory props.'
      );
    }

    // Warn if no Prisma layers are configured
    if (!this.props.prismaEngineLayer && !this.props.prismaMigrationLayer) {
      console.warn(
        '[LambdaFactory] Warning: No Prisma layers configured. ' +
        'Functions requiring database access may fail. ' +
        'Consider adding prismaEngineLayer and/or prismaMigrationLayer to the factory configuration.'
      );
    }

    // Validate that Prisma layers are different if both are provided
    if (this.props.prismaEngineLayer && this.props.prismaMigrationLayer) {
      // Check if they're the same layer (comparing ARNs)
      const engineArn = (this.props.prismaEngineLayer as any).layerVersionArn || '';
      const migrationArn = (this.props.prismaMigrationLayer as any).layerVersionArn || '';
      
      if (engineArn && migrationArn && engineArn === migrationArn) {
        throw new Error(
          'Conflicting layer configuration: prismaEngineLayer and prismaMigrationLayer ' +
          'must be different layers. Engine layer is for runtime queries, ' +
          'Migration layer is for schema migrations. ' +
          `Both are currently pointing to: ${engineArn}`
        );
      }
    }

    // Log successful validation
    console.log('[LambdaFactory] Layer configuration validated successfully:');
    console.log('  - OTEL layer: ✓');
    console.log(`  - Prisma Engine layer: ${this.props.prismaEngineLayer ? '✓' : '✗ (optional)'}`);
    console.log(`  - Prisma Migration layer: ${this.props.prismaMigrationLayer ? '✓' : '✗ (optional)'}`);
  }

}
