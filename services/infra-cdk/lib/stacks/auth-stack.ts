import { BaseStack, BaseStackProps } from '@constructs/base';
import { CognitoAuth } from '@constructs/auth';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { CfnOutput } from 'aws-cdk-lib';
import { getEnvironment, SERVICES, CDK_DEPLOYMENT_SUFFIX } from '@config/index';

export interface AuthStackProps extends BaseStackProps {
  allowedCallbackUrls: string[];
  allowedLogoutUrls: string[];
  samlMetadataUrl?: string;
  emailSender?: string;
}

/**
 * Auth stack that creates Cognito User Pool only
 * Identity Pool is created separately in AuthExtensionsStack to avoid circular dependencies
 */
export class AuthStack extends BaseStack {
  public cognitoAuth: CognitoAuth;
  public userPool: cognito.IUserPool;
  public userPoolClient: cognito.IUserPoolClient;
  private readonly allowedCallbackUrls: string[];
  private readonly allowedLogoutUrls: string[];
  private readonly samlMetadataUrl?: string;
  private readonly emailSender?: string;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, {
      ...props,
      description: 'Auth stack for Managed Care Review - Cognito User Pool and Identity Pool'
    });
    
    // Store required props
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
    const config = getEnvironment(this.stage);
    if (config.features.requireEmailSender && !this.emailSender) {
      throw new Error('emailSender must be provided for this environment to ensure proper email delivery');
    }
  }

  /**
   * Define auth resources
   */
  protected defineResources(): void {
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
    const config = getEnvironment(this.stage);
    
    this.cognitoAuth = new CognitoAuth(this, 'CognitoAuth', {
      userPoolName: SERVICES.UI_AUTH,
      stage: this.stage,
      securityConfig: config.security,
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
    const config = getEnvironment(this.stage);
    
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
    return `mcr-${this.stage}${CDK_DEPLOYMENT_SUFFIX}`;
  }

  /**
   * Get default email sender with domain-verified address
   */
  private getDefaultEmailSender(): string {
    // Use domain-verified address instead of Cognito's default no-reply@verificationemail.com
    return `noreply-${this.stage}@mcr.cms.gov`;
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

    // Add UserPoolClientDomain output if custom domain is configured
    const domain = this.userPool.node.findChild('Domain') as cognito.UserPoolDomain | undefined;
    if (domain) {
      new CfnOutput(this, 'UserPoolClientDomain', {
        value: domain.domainName,
        description: 'Cognito User Pool Domain'
      });
    }

    // Note: Identity Pool outputs will be created in AuthExtensionsStack
  }
}
