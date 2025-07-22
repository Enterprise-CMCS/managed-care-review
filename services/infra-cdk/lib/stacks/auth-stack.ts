import { BaseStack, BaseStackProps } from '@constructs/base';
import { CognitoAuth } from '@constructs/auth';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { CfnOutput } from 'aws-cdk-lib';
import { SERVICES, CDK_DEPLOYMENT_SUFFIX } from '@config/constants';

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
    
    // Validate email sender in production
    if (this.stage === 'prod' && !this.emailSender) {
      throw new Error('emailSender must be provided in production to ensure proper email delivery');
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
   * Create Cognito authentication infrastructure
   */
  private createCognitoAuth(): void {

    this.cognitoAuth = new CognitoAuth(this, 'CognitoAuth', {
      userPoolName: SERVICES.UI_AUTH,
      stage: this.stage,
      securityConfig: this.stageConfig.security,
      samlMetadataUrl: this.samlMetadataUrl || this.getSamlMetadataUrl(),
      customDomain: this.getCustomDomain(),
      emailSender: this.emailSender || this.getDefaultEmailSender(),
      allowedCallbackUrls: this.allowedCallbackUrls,
      allowedLogoutUrls: this.allowedLogoutUrls,
      identityPoolName: SERVICES.UI_AUTH,
      s3Buckets: this.getS3BucketsForIdentityPool()
      // Note: API Gateway ID will be added by api-compute-stack after it's created
    });

    // Set public properties
    this.userPool = this.cognitoAuth.userPool;
    this.userPoolClient = this.cognitoAuth.userPoolClient;
    this.identityPool = this.cognitoAuth.identityPool;
    this.authenticatedRole = this.cognitoAuth.authenticatedRole;

    // Create outputs
    this.createOutputs();
  }

  /**
   * Get SAML metadata URL based on stage
   */
  private getSamlMetadataUrl(): string | undefined {
    // Only use SAML for production environments
    // Development environments can test without external SAML dependencies
    if (this.stage === 'prod') {
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
   * Get S3 buckets that authenticated users can access
   */
  private getS3BucketsForIdentityPool(): string[] {
    // These will be the actual bucket names created in data stack
    return [
      `mcr-${this.stage}-uploads-cdk-bucket`,
      `mcr-${this.stage}-qa-cdk-bucket`
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
    if (!this.authenticatedRole || !this.identityPool) return;

    // Create a single policy with statements for each group
    // Using ForAnyValue:StringLike to check groups claim passed from User Pool to Identity Pool
    const groupBasedPolicy = new iam.Policy(this, 'GroupBasedAccessPolicy', {
      statements: [
        // Admin group - full access
        new iam.PolicyStatement({
          sid: 'AdminGroupFullAccess',
          effect: iam.Effect.ALLOW,
          actions: ['*'],
          resources: ['*'],
          conditions: {
            StringEquals: {
              'cognito-identity.amazonaws.com:aud': this.identityPool.ref
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': '*:ADMIN'
            }
          }
        }),
        
        // State user group - can upload and manage submissions
        new iam.PolicyStatement({
          sid: 'StateUserGroupAccess',
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
              'cognito-identity.amazonaws.com:aud': this.identityPool.ref
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': '*:STATE_USER'
            }
          }
        }),
        
        // CMS user group - can review and update submissions
        new iam.PolicyStatement({
          sid: 'CmsUserGroupAccess',
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
              'cognito-identity.amazonaws.com:aud': this.identityPool.ref
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': '*:CMS_USER'
            }
          }
        }),
        
        // Read-only group - view only access
        new iam.PolicyStatement({
          sid: 'ReadOnlyGroupAccess',
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject',
            'dynamodb:GetItem',
            'dynamodb:Query'
          ],
          resources: ['*'],
          conditions: {
            StringEquals: {
              'cognito-identity.amazonaws.com:aud': this.identityPool.ref
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': '*:READ_ONLY'
            }
          }
        })
      ]
    });

    // Actually attach the policy to the authenticated role
    this.authenticatedRole.attachInlinePolicy(groupBasedPolicy);

    // Note: In production, resources should be specific rather than wildcards
  }

  /**
   * Create stack outputs
   */
  private createOutputs(): void {
    new CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID'
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID'
    });

    if (this.identityPool) {
      new CfnOutput(this, 'IdentityPoolId', {
        value: this.identityPool.ref,
        description: 'Cognito Identity Pool ID'
      });
    }

    // Add UserPoolClientDomain output if custom domain is configured
    const domain = this.userPool.node.findChild('Domain') as cognito.UserPoolDomain | undefined;
    if (domain) {
      new CfnOutput(this, 'UserPoolClientDomain', {
        value: domain.domainName,
        description: 'Cognito User Pool Domain'
      });
    }
  }
}
