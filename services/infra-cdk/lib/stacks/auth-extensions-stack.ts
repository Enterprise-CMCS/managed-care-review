import { BaseStack, BaseStackProps } from '@constructs/base';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { CfnOutput } from 'aws-cdk-lib';
import { ResourceNames, SERVICES } from '@config/index';

export interface AuthExtensionsStackProps extends BaseStackProps {
  s3BucketNames: string[];
  apiGatewayArns: string[];
}

/**
 * Auth Extensions Stack - creates Identity Pool after APIs exist
 * Breaks circular dependency between AuthStack and API stacks
 */
export class AuthExtensionsStack extends BaseStack {
  public identityPool: cognito.CfnIdentityPool;
  public authenticatedRole: iam.Role;
  private readonly s3BucketNames: string[];
  private readonly apiGatewayArns: string[];

  constructor(scope: Construct, id: string, props: AuthExtensionsStackProps) {
    super(scope, id, {
      ...props,
      description: 'Identity Pool and authenticated roles - completes auth setup'
    });

    this.s3BucketNames = props.s3BucketNames;
    this.apiGatewayArns = props.apiGatewayArns;

    this.defineResources();
  }

  protected defineResources(): void {
    // Import User Pool from SSM parameters (created by AuthStack)
    const userPoolId = ssm.StringParameter.valueForStringParameter(
      this, 
      `/mcr-cdk-cognito/${this.stage}/user-pool-id`
    );
    const userPoolClientId = ssm.StringParameter.valueForStringParameter(
      this, 
      `/mcr-cdk-cognito/${this.stage}/user-pool-client-id`
    );

    // Create Identity Pool - now that APIs exist, no circular dependency
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: ResourceNames.resourceName(SERVICES.UI_AUTH, 'identity-pool', this.stage),
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: userPoolClientId,
        providerName: `cognito-idp.${this.region}.amazonaws.com/${userPoolId}`
      }]
    });

    // Create authenticated role with proper permissions
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
      roleName: ResourceNames.resourceName(SERVICES.UI_AUTH, 'authenticated-role', this.stage),
      description: 'Default role for authenticated users'
    });

    // Add base Cognito permissions
    this.authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'mobileanalytics:PutEvents',
        'cognito-sync:*',
        'cognito-identity:*'
      ],
      resources: ['*']
    }));

    // Create unauthenticated role (required but not used)
    const unauthenticatedRole = new iam.Role(this, 'UnauthenticatedRole', {
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
      roleName: ResourceNames.resourceName(SERVICES.UI_AUTH, 'unauthenticated-role', this.stage),
      description: 'Default role for unauthenticated users'
    });

    // Attach roles to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'RoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: this.authenticatedRole.roleArn,
        unauthenticated: unauthenticatedRole.roleArn
      }
    });

    // Grant S3 permissions for uploads and downloads
    this.grantS3Permissions();

    // Grant API Gateway permissions
    this.grantApiGatewayPermissions();

    // Configure group-based access policies
    this.configureGroupBasedPolicies();

    // Store Identity Pool ID in SSM for other stacks (CDK-specific paths)
    new ssm.StringParameter(this, 'IdentityPoolIdParameter', {
      parameterName: `/mcr-cdk-cognito/${this.stage}/identity-pool-id`,
      stringValue: this.identityPool.ref,
      description: 'CDK-managed Cognito Identity Pool ID for cross-stack reference'
    });

    // Create outputs
    this.createOutputs();
  }

  /**
   * Grant S3 permissions to authenticated users
   */
  private grantS3Permissions(): void {
    if (this.s3BucketNames.length === 0) return;

    const s3Resources: string[] = [];
    this.s3BucketNames.forEach(bucketName => {
      // Add shared access paths
      s3Resources.push(`arn:aws:s3:::${bucketName}/allusers/*`);
      // Add user-specific access paths
      s3Resources.push(`arn:aws:s3:::${bucketName}/private/\${cognito-identity.amazonaws.com:sub}/*`);
    });

    this.authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject'
      ],
      resources: s3Resources
    }));
  }

  /**
   * Grant API Gateway permissions
   */
  private grantApiGatewayPermissions(): void {
    if (this.apiGatewayArns.length === 0) return;

    this.authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:Invoke'],
      resources: this.apiGatewayArns
    }));
  }

  /**
   * Configure group-based access policies (from original AuthStack)
   */
  private configureGroupBasedPolicies(): void {
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
        
        // State user group - submission management
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
        
        // CMS user group - review and update
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
        
        // Read-only group - view only
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

    this.authenticatedRole.attachInlinePolicy(groupBasedPolicy);
  }

  /**
   * Create stack outputs
   */
  private createOutputs(): void {
    new CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      description: 'Cognito Identity Pool ID'
    });

    new CfnOutput(this, 'AuthenticatedRoleArn', {
      value: this.authenticatedRole.roleArn,
      description: 'Authenticated Role ARN'
    });
  }
}