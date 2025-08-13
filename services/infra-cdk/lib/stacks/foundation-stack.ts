import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { stackName, PROJECT_NAME, PROJECT_PREFIX, getConfig } from '../config';

/**
 * Foundation stack that sets up base infrastructure components
 * This stack should have no dependencies and be deployed first
 */
export interface FoundationStackProps extends StackProps {
  stage: string;
}

export class FoundationStack extends Stack {
  public jwtSecret: secretsmanager.ISecret;
  private readonly stage: string;

  constructor(scope: Construct, id: string, props: FoundationStackProps) {
    super(scope, id, {
      ...props,
      stackName: stackName('Foundation', props.stage),
      description: 'Foundation stack for Managed Care Review - sets up base infrastructure'
    });
    
    this.stage = props.stage;
    this.defineResources();
  }

  /**
   * Define foundation resources
   */
  private defineResources(): void {
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
      parameterName: `/mcr-cdk/${this.stage}/foundation/initialized`,
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
    const config = getConfig(this.stage);
    // Store stage config as JSON for other stacks to reference
    new ssm.StringParameter(this, 'StageConfigParameter', {
      parameterName: `/${PROJECT_PREFIX}/${this.stage}/config/stage`,
      stringValue: JSON.stringify({
        stage: this.stage,
        account: config.account,
        region: config.region,
        monitoring: {},
        security: config.security,
        lambda: {
          memorySize: config.lambda.memorySize,
          timeout: config.lambda.timeout,
          architecture: 'x86_64'
        },
        database: config.database
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