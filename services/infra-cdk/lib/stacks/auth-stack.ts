import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { CognitoAuth } from '@constructs/auth';
import { stackName, getConfig } from '../config';

export interface AuthStackProps extends StackProps {
  stage: string;
  allowedCallbackUrls: string[];
  allowedLogoutUrls: string[];
  samlMetadataUrl?: string;
  emailSender?: string;
}

/**
 * Auth stack that creates Cognito User Pool only
 * Identity Pool is created separately in AuthExtensionsStack to avoid circular dependencies
 */
export class AuthStack extends Stack {
  public cognitoAuth: CognitoAuth;
  public userPool: cognito.IUserPool;
  public userPoolClient: cognito.IUserPoolClient;
  private readonly stage: string;
  private readonly allowedCallbackUrls: string[];
  private readonly allowedLogoutUrls: string[];
  private readonly samlMetadataUrl?: string;
  private readonly emailSender?: string;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, {
      ...props,
      stackName: stackName('Auth', props.stage),
      description: 'Auth stack for Managed Care Review - Cognito User Pool and Identity Pool'
    });
    
    // Store required props
    this.stage = props.stage;
    this.allowedCallbackUrls = props.allowedCallbackUrls;
    this.allowedLogoutUrls = props.allowedLogoutUrls;
    this.samlMetadataUrl = props.samlMetadataUrl;
    this.emailSender = props.emailSender;
    
    // Validate critical configuration
    this.validateConfiguration();
    
    // Define resources after all properties are initialized
    this.defineResources();
  }

  /**
   * Validate critical configuration to prevent silent failures
   */
  private validateConfiguration(): void {
    // Validate callback URLs - critical for authentication flow
    if (this.allowedCallbackUrls.length === 0) {
      throw new Error('allowedCallbackUrls must not be empty - authentication will fail without valid callback URLs');
    }
    
    // Validate logout URLs
    if (this.allowedLogoutUrls.length === 0) {
      throw new Error('allowedLogoutUrls must not be empty - logout flow will fail without valid logout URLs');
    }
    
    // Validate email sender when required by config
    const config = getConfig(this.stage);
    if (config.features.requireEmailSender && !this.emailSender) {
      throw new Error('emailSender must be provided for this environment to ensure proper email delivery');
    }
  }

  /**
   * Define auth resources
   */
  private defineResources(): void {
    // Create Cognito authentication infrastructure
    this.createCognitoAuth();

    // Add Lambda triggers if needed
    this.addLambdaTriggers();

    // Add custom attributes and groups
    this.configureUserPoolExtensions();
  }

  /**
   * Create Cognito User Pool infrastructure only
   */
  private createCognitoAuth(): void {
    const config = getConfig(this.stage);
    
    this.cognitoAuth = new CognitoAuth(this, 'CognitoAuth', {
      userPoolName: 'ui_auth',
      stage: this.stage,
      securityConfig: {
        cognitoMfa: 'OFF'  // Default MFA setting
      },
      samlMetadataUrl: this.samlMetadataUrl || this.getSamlMetadataUrl(),
      customDomain: this.getCustomDomain(),
      emailSender: this.emailSender || this.getDefaultEmailSender(),
      allowedCallbackUrls: this.allowedCallbackUrls,
      allowedLogoutUrls: this.allowedLogoutUrls
      // Note: identityPoolName and s3Buckets removed to prevent Identity Pool creation
      // Identity Pool will be created separately in AuthExtensionsStack
    });

    // Set public properties (User Pool only)
    this.userPool = this.cognitoAuth.userPool;
    this.userPoolClient = this.cognitoAuth.userPoolClient;

    // Store User Pool ARN in SSM for other stacks to reference (CDK-specific paths)
    new ssm.StringParameter(this, 'UserPoolArnParameter', {
      parameterName: `/mcr-cdk-cognito/${this.stage}/user-pool-arn`,
      stringValue: this.userPool.userPoolArn,
      description: 'CDK-managed Cognito User Pool ARN for cross-stack reference'
    });

    new ssm.StringParameter(this, 'UserPoolIdParameter', {
      parameterName: `/mcr-cdk-cognito/${this.stage}/user-pool-id`,
      stringValue: this.userPool.userPoolId,
      description: 'CDK-managed Cognito User Pool ID for cross-stack reference'
    });

    new ssm.StringParameter(this, 'UserPoolClientIdParameter', {
      parameterName: `/mcr-cdk-cognito/${this.stage}/user-pool-client-id`,
      stringValue: this.userPoolClient.userPoolClientId,
      description: 'CDK-managed Cognito User Pool Client ID for cross-stack reference'
    });

    // Create outputs
    this.createOutputs();
  }

  /**
   * Get SAML metadata URL based on stage
   */
  private getSamlMetadataUrl(): string | undefined {
    const config = getConfig(this.stage);
    
    // Only use SAML for production environments
    // Development environments can test without external SAML dependencies
    if (config.features.requireEmailSender) { // Using this as proxy for production-level requirements
      return `{{/configuration/okta_metadata_url}}`;
    }
    
    // For dev/val, skip SAML provider to avoid external dependencies
    return undefined;
  }

  /**
   * Get custom domain for Cognito hosted UI
   */
  private getCustomDomain(): string {
    return `mcr-${this.stage}-cdk`;
  }

  /**
   * Get default email sender from SSM parameter (matching Serverless configuration)
   */
  private getDefaultEmailSender(): string {
    // Use the same SSM parameter that Serverless uses
    try {
      return ssm.StringParameter.valueForStringParameter(this, '/configuration/email/sourceAddress');
    } catch (error) {
      console.warn('Email source address not found in SSM, using undefined to let Cognito use default');
      return '';
    }
  }


  /**
   * Add Lambda triggers to User Pool
   */
  private addLambdaTriggers(): void {
    // Pre-signup trigger for validation
    // This would be implemented when migrating app-api Lambda functions
    
    // Post-confirmation trigger for initial setup
    // This would be implemented when migrating app-api Lambda functions

    // Custom message trigger for email customization
    // This would be implemented when migrating app-api Lambda functions
  }

  /**
   * Configure User Pool extensions like groups
   */
  private configureUserPoolExtensions(): void {
    // Create user groups
    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'ADMIN',
      description: 'Administrator users with full access',
      precedence: 1
    });

    new cognito.CfnUserPoolGroup(this, 'StateUserGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'STATE_USER',
      description: 'State users who can submit rates',
      precedence: 10
    });

    new cognito.CfnUserPoolGroup(this, 'CmsUserGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'CMS_USER',
      description: 'CMS users who can review rates',
      precedence: 10
    });

    new cognito.CfnUserPoolGroup(this, 'ReadOnlyGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'READ_ONLY',
      description: 'Read-only users',
      precedence: 20
    });

    // Note: Group-based IAM policies will be configured in AuthExtensionsStack
    // when the Identity Pool and authenticated role are created
  }


  /**
   * Create stack outputs
   */
  private createOutputs(): void {
    // Outputs for GitHub Actions workflow (existing format)
    new CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID'
    });

    new CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN'
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID'
    });

    // Outputs for app-web cf: lookups (serverless compatibility)
    new CfnOutput(this, 'UserPoolIdExport', {
      value: this.userPool.userPoolId,
      exportName: `ui-auth-${this.stage}-UserPoolId`,
      description: 'Cognito User Pool ID for cf: lookups'
    });

    new CfnOutput(this, 'UserPoolClientIdExport', {
      value: this.userPoolClient.userPoolClientId,
      exportName: `ui-auth-${this.stage}-UserPoolClientId`,
      description: 'Cognito User Pool Client ID for cf: lookups'
    });

    new CfnOutput(this, 'Region', {
      value: this.region,
      exportName: `ui-auth-${this.stage}-Region`,
      description: 'AWS region for cf: lookups'
    });

    new CfnOutput(this, 'UserPoolClientDomain', {
      value: `${this.stage}-login-${this.userPoolClient.userPoolClientId}.auth.${this.region}.amazoncognito.com`,
      exportName: `ui-auth-${this.stage}-UserPoolClientDomain`,
      description: 'Cognito User Pool Domain for cf: lookups'
    });

    // Note: Identity Pool outputs will be created in AuthExtensionsStack
  }
}
