import { BaseStack, BaseStackProps } from '@constructs/base';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { PROJECT_PREFIX } from '@config/index';

/**
 * Foundation stack that sets up base infrastructure components
 * This stack should have no dependencies and be deployed first
 */
export class FoundationStack extends BaseStack {
  public jwtSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, {
      ...props,
      description: 'Foundation stack for Managed Care Review - sets up base infrastructure'
    });
    
    this.defineResources();
  }

  /**
   * Define foundation resources
   */
  protected defineResources(): void {
    // Create JWT secret
    this.createJwtSecret();

    // Create base SSM parameter paths
    this.createParameterPaths();

    // Store stage configuration
    this.storeStageConfiguration();

    // Apply any stack-level suppressions
    this.applyStackSuppressions();
  }

  /**
   * Create SSM parameter path hierarchy (CDK-specific paths)
   */
  private createParameterPaths(): void {
    // Create root parameter to establish hierarchy
    new ssm.StringParameter(this, 'RootParameter', {
      parameterName: `/${PROJECT_PREFIX}/${this.stage}/foundation/initialized`,
      stringValue: new Date().toISOString(),
      description: `Foundation initialization timestamp for ${this.stage}`
    });

    // Store CDK version for tracking
    new ssm.StringParameter(this, 'CdkVersionParameter', {
      parameterName: `/${PROJECT_PREFIX}/${this.stage}/foundation/cdk-version`,
      stringValue: require('aws-cdk-lib/package.json').version,
      description: 'CDK version used for deployment'
    });

    // Store deployment metadata
    new ssm.StringParameter(this, 'DeploymentMetadata', {
      parameterName: `/${PROJECT_PREFIX}/${this.stage}/foundation/deployment-metadata`,
      stringValue: JSON.stringify({
        account: this.account,
        region: this.region,
        stage: this.stage,
        stackName: this.stackName,
        deployedAt: new Date().toISOString()
      }),
      description: 'Deployment metadata for tracking'
    });
  }

  /**
   * Store stage configuration in Parameter Store (CDK-specific paths)
   */
  private storeStageConfiguration(): void {
    // Store stage config as JSON for other stacks to reference
    new ssm.StringParameter(this, 'StageConfigParameter', {
      parameterName: `/${PROJECT_PREFIX}/${this.stage}/config/stage`,
      stringValue: JSON.stringify({
        stage: this.stage,
        account: this.stageConfig.account,
        region: this.stageConfig.region,
        monitoring: this.stageConfig.monitoring,
        security: this.stageConfig.security,
        lambda: {
          memorySize: this.stageConfig.lambda.memorySize,
          timeout: this.stageConfig.lambda.timeout.toSeconds(),
          architecture: this.stageConfig.lambda.architecture
        },
        database: this.stageConfig.database
      }),
      description: `Stage configuration for ${this.stage}`
    });
  }

  /**
   * Apply stack-level CDK Nag suppressions
   */
  private applyStackSuppressions(): void {
    // No specific suppressions needed for foundation stack
    // But this method is here for consistency and future use
  }

  /**
   * Create JWT secret for API authentication (CDK-specific naming)
   */
  private createJwtSecret(): void {
    this.jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
      secretName: `mcr-cdk-api-jwt-secret-${this.stage}`,
      description: 'CDK-managed JWT secret for API authentication',
      generateSecretString: {
        secretStringTemplate: '{}',
        generateStringKey: 'jwtsigningkey',
        passwordLength: 128,
        excludePunctuation: true,
        excludeUppercase: true,
        excludeCharacters: 'ghijklmnopqrstuvwxyz', // Generate hex string [0-9a-f]
        requireEachIncludedType: false
      }
    });

    // Store secret ARN in SSM for easy reference (CDK-specific paths)
    new ssm.StringParameter(this, 'JwtSecretArnParameter', {
      parameterName: `/${PROJECT_PREFIX}/${this.stage}/foundation/jwt-secret-arn`,
      stringValue: this.jwtSecret.secretArn,
      description: 'ARN of CDK-managed JWT secret for API authentication'
    });
  }
}
