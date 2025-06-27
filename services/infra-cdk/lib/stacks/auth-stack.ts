import { BaseStack, BaseStackProps } from '@constructs/base';
import { CognitoAuth } from '@constructs/auth';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { SERVICES } from '@config/constants';

export interface AuthStackProps extends BaseStackProps {
  allowedCallbackUrls: string[];
  allowedLogoutUrls: string[];
  samlMetadataUrl?: string;
  emailSender?: string;
}

/**
 * Auth stack that creates Cognito User Pool and Identity Pool
 */
export class AuthStack extends BaseStack {
  public cognitoAuth: CognitoAuth;
  public userPool: cognito.IUserPool;
  public userPoolClient: cognito.IUserPoolClient;
  public identityPool?: cognito.CfnIdentityPool;
  public authenticatedRole?: iam.IRole;
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
    
    // Define resources after all properties are initialized
    this.defineResources();
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

    // Create SSM parameters for resources that other services might need
    this.createSsmParameters();
  }

  /**
   * Create Cognito authentication infrastructure
   */
  private createCognitoAuth(): void {

    this.cognitoAuth = new CognitoAuth(this, 'CognitoAuth', {
      userPoolName: SERVICES.UI_AUTH,
      stage: this.stage,
      securityConfig: this.stageConfig.security,
      samlMetadataUrl: this.samlMetadataUrl || this.getSamlMetadataUrl(),
      customDomain: this.getCustomDomain(),
      emailSender: this.emailSender,
      allowedCallbackUrls: this.allowedCallbackUrls,
      allowedLogoutUrls: this.allowedLogoutUrls,
      identityPoolName: SERVICES.UI_AUTH,
      s3Buckets: this.getS3BucketsForIdentityPool()
    });

    // Set public properties
    this.userPool = this.cognitoAuth.userPool;
    this.userPoolClient = this.cognitoAuth.userPoolClient;
    this.identityPool = this.cognitoAuth.identityPool;
    this.authenticatedRole = this.cognitoAuth.authenticatedRole;
  }

  /**
   * Get SAML metadata URL based on stage
   */
  private getSamlMetadataUrl(): string {
    // In production, this would be the actual Okta metadata URL
    // Using SSM parameter reference for flexibility
    return `{{/${this.stage}/okta/metadata-url}}`;
  }

  /**
   * Get custom domain for Cognito hosted UI
   */
  private getCustomDomain(): string {
    return `mcr-${this.stage}`;
  }

  /**
   * Get S3 buckets that authenticated users can access
   */
  private getS3BucketsForIdentityPool(): string[] {
    // These will be the actual bucket names created in data stack
    return [
      `mcr-${this.stage}-uploads-bucket`,
      `mcr-${this.stage}-qa-bucket`
    ];
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
    const adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'ADMIN',
      description: 'Administrator users with full access',
      precedence: 1
    });

    const stateUserGroup = new cognito.CfnUserPoolGroup(this, 'StateUserGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'STATE_USER',
      description: 'State users who can submit rates',
      precedence: 10
    });

    const cmsUserGroup = new cognito.CfnUserPoolGroup(this, 'CmsUserGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'CMS_USER',
      description: 'CMS users who can review rates',
      precedence: 10
    });

    const readOnlyGroup = new cognito.CfnUserPoolGroup(this, 'ReadOnlyGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'READ_ONLY',
      description: 'Read-only users',
      precedence: 20
    });

    // If we have an authenticated role, attach policies for groups
    if (this.authenticatedRole) {
      this.attachGroupPolicies();
    }
  }

  /**
   * Attach IAM policies for different user groups
   */
  private attachGroupPolicies(): void {
    if (!this.authenticatedRole) return;

    // Create policies for different groups
    const adminPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['*'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': this.identityPool?.ref,
          'cognito:groups': 'ADMIN'
        }
      }
    });

    const stateUserPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:DeleteObject',
        'dynamodb:PutItem',
        'dynamodb:GetItem',
        'dynamodb:Query'
      ],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': this.identityPool?.ref,
          'cognito:groups': 'STATE_USER'
        }
      }
    });

    const cmsUserPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        'dynamodb:GetItem',
        'dynamodb:Query',
        'dynamodb:UpdateItem'
      ],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': this.identityPool?.ref,
          'cognito:groups': 'CMS_USER'
        }
      }
    });

    const readOnlyPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        'dynamodb:GetItem',
        'dynamodb:Query'
      ],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': this.identityPool?.ref,
          'cognito:groups': 'READ_ONLY'
        }
      }
    });

    // Note: In a real implementation, these would be more granular
    // and resources would be specific rather than wildcards
  }

  /**
   * Create SSM parameters for auth resources that other stacks/services need
   */
  private createSsmParameters(): void {
    // Create SSM parameter for User Pool ID
    new ssm.StringParameter(this, 'UserPoolIdParameter', {
      parameterName: `/mcr/${this.stage}/auth/user-pool-id`,
      stringValue: this.userPool.userPoolId,
      description: 'Cognito User Pool ID for MCR application'
    });

    // Create SSM parameter for User Pool Client ID (often needed together)
    new ssm.StringParameter(this, 'UserPoolClientIdParameter', {
      parameterName: `/mcr/${this.stage}/auth/user-pool-client-id`,
      stringValue: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID for MCR application'
    });

    // Create SSM parameter for Identity Pool ID if it exists
    if (this.identityPool) {
      new ssm.StringParameter(this, 'IdentityPoolIdParameter', {
        parameterName: `/mcr/${this.stage}/auth/identity-pool-id`,
        stringValue: this.identityPool.ref,
        description: 'Cognito Identity Pool ID for MCR application'
      });
    }
  }
}
