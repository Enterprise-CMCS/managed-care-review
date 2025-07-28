import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { SecurityConfig } from '@config/index';
import { ResourceNames } from '@config/index';
import { ServiceRegistry } from '@constructs/base';
// import { NagSuppressions } from 'cdk-nag';

export interface CognitoAuthProps {
  userPoolName: string;
  stage: string;
  securityConfig: SecurityConfig;
  samlMetadataUrl?: string;
  customDomain?: string;
  emailSender?: string;
  identityPoolName?: string;
  allowedCallbackUrls?: string[];
  allowedLogoutUrls?: string[];
  s3Buckets?: string[];
}

/**
 * Cognito authentication setup with User Pool and Identity Pool
 */
export class CognitoAuth extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public identityPool?: cognito.CfnIdentityPool;
  public authenticatedRole?: iam.Role;
  public unauthenticatedRole?: iam.Role;
  public readonly samlProvider?: cognito.UserPoolIdentityProviderSaml;
  private readonly stage: string;

  constructor(scope: Construct, id: string, props: CognitoAuthProps) {
    super(scope, id);
    this.stage = props.stage;

    // Create User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: ResourceNames.resourceName(props.userPoolName, 'user-pool', props.stage),
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
        username: false
      },
      autoVerify: {
        email: true
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true
        },
        givenName: {
          required: true,
          mutable: true
        },
        familyName: {
          required: true,
          mutable: true
        }
      },
      customAttributes: {
        state_code: new cognito.StringAttribute({
          minLen: 2,
          maxLen: 2,
          mutable: true
        }),
        role: new cognito.StringAttribute({
          minLen: 1,
          maxLen: 50,
          mutable: true
        })
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(7)
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: this.getMfaConfig(props.securityConfig),
      mfaSecondFactor: {
        sms: false,
        otp: true
      },
      email: props.emailSender ? cognito.UserPoolEmail.withSES({
        sesRegion: Stack.of(this).region,
        fromEmail: props.emailSender,
        fromName: 'Managed Care Review'
      }) : cognito.UserPoolEmail.withCognito(),
      advancedSecurityMode: props.stage === 'prod' 
        ? cognito.AdvancedSecurityMode.ENFORCED 
        : cognito.AdvancedSecurityMode.OFF,
      removalPolicy: props.stage === 'prod' 
        ? RemovalPolicy.RETAIN 
        : RemovalPolicy.DESTROY
    });

    // Add SAML provider if URL provided and valid
    if (props.samlMetadataUrl) {
      this.samlProvider = this.addSamlProvider(props.samlMetadataUrl);
    }

    // Create User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `${props.userPoolName}-${props.stage}-client`,
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE
        ],
        callbackUrls: props.allowedCallbackUrls,
        logoutUrls: props.allowedLogoutUrls
      },
      preventUserExistenceErrors: true,
      supportedIdentityProviders: this.samlProvider 
        ? [
            cognito.UserPoolClientIdentityProvider.COGNITO,
            cognito.UserPoolClientIdentityProvider.custom(this.samlProvider.providerName)
          ]
        : [cognito.UserPoolClientIdentityProvider.COGNITO],
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          givenName: true,
          familyName: true
        })
        .withCustomAttributes('state_code', 'role'),
      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          givenName: true,
          familyName: true
        })
        .withCustomAttributes('state_code', 'role')
    });

    // Create custom domain if provided
    if (props.customDomain) {
      this.userPool.addDomain('Domain', {
        cognitoDomain: {
          domainPrefix: props.customDomain
        }
      });
    }

    // Create Identity Pool if name provided
    if (props.identityPoolName) {
      this.createIdentityPool(props);
    }

    // Store values in Parameter Store
    this.storeInParameterStore(props.stage);

    // Apply CDK Nag suppressions
    this.applyCdkNagSuppressions();
  }

  /**
   * Get MFA configuration based on security config
   */
  private getMfaConfig(securityConfig: SecurityConfig): cognito.Mfa {
    switch (securityConfig.cognitoMfa) {
      case 'OFF':
        return cognito.Mfa.OFF;
      case 'OPTIONAL':
        return cognito.Mfa.OPTIONAL;
      case 'REQUIRED':
        return cognito.Mfa.REQUIRED;
      default:
        return cognito.Mfa.OFF;
    }
  }

  /**
   * Add SAML identity provider
   */
  private addSamlProvider(metadataUrl: string): cognito.UserPoolIdentityProviderSaml {
    // Get metadata URL from SSM if it's a parameter reference
    const metadata = metadataUrl.startsWith('{{') 
      ? ssm.StringParameter.valueForStringParameter(this, metadataUrl.replace(/[{}]/g, ''))
      : metadataUrl;

    return new cognito.UserPoolIdentityProviderSaml(this, 'SamlProvider', {
      userPool: this.userPool,
      metadata: {
        metadataType: cognito.UserPoolIdentityProviderSamlMetadataType.URL,
        metadataContent: metadata
      },
      attributeMapping: {
        // Standard attributes
        email: cognito.ProviderAttribute.other('email'),
        givenName: cognito.ProviderAttribute.other('firstName'),
        familyName: cognito.ProviderAttribute.other('lastName'),
        
        // Custom attributes - CDK requires them in a 'custom' object
        custom: {
          'custom:state_code': cognito.ProviderAttribute.other('stateCode'),
          'custom:role': cognito.ProviderAttribute.other('role')
        }
      } as cognito.AttributeMapping,
      name: 'Okta'
    });
  }

  /**
   * Create Identity Pool with roles
   */
  private createIdentityPool(props: CognitoAuthProps): void {
    // Create Identity Pool first
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: ResourceNames.resourceName(props.identityPoolName!, 'identity-pool', props.stage),
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: this.userPoolClient.userPoolClientId,
        providerName: this.userPool.userPoolProviderName
      }]
    });

    // Create authenticated role with proper identity pool reference
    this.authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated'
          }
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      roleName: ResourceNames.resourceName(props.identityPoolName!, 'authenticated-role', props.stage),
      description: 'Default role for authenticated users'
    });

    // Add base Cognito permissions (matching serverless)
    this.authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'mobileanalytics:PutEvents',
        'cognito-sync:*',
        'cognito-identity:*'
      ],
      resources: ['*']
    }));

    // Create unauthenticated role (not used but required by Identity Pool)
    this.unauthenticatedRole = new iam.Role(this, 'UnauthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated'
          }
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      roleName: ResourceNames.resourceName(props.identityPoolName!, 'unauthenticated-role', props.stage),
      description: 'Default role for unauthenticated users'
    });

    // Attach roles to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'RoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: this.authenticatedRole.roleArn,
        unauthenticated: this.unauthenticatedRole.roleArn
      }
    });

    // Grant S3 permissions if buckets provided
    if (props.s3Buckets && props.s3Buckets.length > 0) {
      this.grantS3Permissions(props.s3Buckets);
    }
  }

  /**
   * Grant S3 permissions to authenticated role (matching serverless ui-auth)
   */
  private grantS3Permissions(bucketNames: string[]): void {
    if (!this.authenticatedRole) return;

    // Build resources array matching serverless pattern
    const s3Resources: string[] = [];
    
    bucketNames.forEach(bucketName => {
      // Add /allusers/* path for shared access
      s3Resources.push(`arn:aws:s3:::${bucketName}/allusers/*`);
      
      // Add /private/${cognito-identity.amazonaws.com:sub}/* for user-specific access
      // Note: Using Fn::Join to properly interpolate the cognito sub
      s3Resources.push(`arn:aws:s3:::${bucketName}/private/\${cognito-identity.amazonaws.com:sub}/*`);
    });

    // Grant S3 permissions matching serverless configuration
    this.authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:*'],
      resources: s3Resources
    }));
  }

  /**
   * Store values in Parameter Store
   */
  private storeInParameterStore(stage: string): void {
    ServiceRegistry.putUserPoolId(this, stage, this.userPool.userPoolId);
    ServiceRegistry.putUserPoolClientId(this, stage, this.userPoolClient.userPoolClientId);
    
    if (this.identityPool) {
      ServiceRegistry.putIdentityPoolId(this, stage, this.identityPool.ref);
    }
  }

  /**
   * Apply CDK Nag suppressions
   */
  private applyCdkNagSuppressions(): void {
    // CDK Nag suppressions temporarily disabled
    // Will be re-enabled once synthesis is working
  }
}
