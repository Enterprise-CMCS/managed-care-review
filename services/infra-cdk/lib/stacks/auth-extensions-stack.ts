import { Stack, StackProps } from 'aws-cdk-lib';
import { stackName } from '../config';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { CfnOutput, Duration } from 'aws-cdk-lib';
import { ResourceNames, SERVICES, SSM_PATHS } from '@config/index';

export interface AuthExtensionsStackProps extends StackProps {
  stage: string;
  s3BucketNames: string[];
  apiGatewayArns: string[];
}

/**
 * Auth Extensions Stack - creates Identity Pool after APIs exist
 * Breaks circular dependency between AuthStack and API stacks
 */
export class AuthExtensionsStack extends Stack {
  public identityPool: cognito.CfnIdentityPool;
  public authenticatedRole: iam.Role;
  private readonly stage: string;
  private readonly s3BucketNames: string[];
  private readonly apiGatewayArns: string[];

  constructor(scope: Construct, id: string, props: AuthExtensionsStackProps) {
    super(scope, id, {
      ...props,
      stackName: stackName('AuthExtensions', props.stage),
      description: 'Identity Pool and authenticated roles - completes auth setup'
    });

    this.stage = props.stage;
    this.s3BucketNames = props.s3BucketNames;
    this.apiGatewayArns = props.apiGatewayArns;

    this.defineResources();
  }

  private defineResources(): void {
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
    
    // Create redirect Lambda function for auth flows
    this.createRedirectFunction(userPoolId, userPoolClientId);
    
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

    const s3ObjectResources: string[] = [];
    const s3BucketResources: string[] = [];
    
    this.s3BucketNames.forEach(bucketName => {
      // Add bucket-level resources
      s3BucketResources.push(`arn:aws:s3:::${bucketName}`);
      // Add object-level resources for all paths
      s3ObjectResources.push(`arn:aws:s3:::${bucketName}/*`);
    });

    // Grant read permissions for viewing object details in console
    this.authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:GetObjectVersion',
        's3:GetObjectTagging',
        's3:GetObjectVersionTagging',
        's3:GetObjectAttributes',
        's3:GetObjectMetadata'
      ],
      resources: s3ObjectResources
    }));

    // Grant bucket-level permissions
    this.authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:ListBucket',
        's3:GetBucketLocation',
        's3:GetBucketVersioning',
        's3:ListBucketVersions'
      ],
      resources: s3BucketResources
    }));

    // Grant write permissions for specific paths
    const s3WriteResources: string[] = [];
    this.s3BucketNames.forEach(bucketName => {
      // Add shared access paths
      s3WriteResources.push(`arn:aws:s3:::${bucketName}/allusers/*`);
      // Add user-specific access paths
      s3WriteResources.push(`arn:aws:s3:::${bucketName}/private/$\{cognito-identity.amazonaws.com:sub}/*`);
    });

    this.authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:DeleteObject'
      ],
      resources: s3WriteResources
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
   * Create redirect Lambda function for auth flows
   */
  private createRedirectFunction(userPoolId: string, userPoolClientId: string): void {
    // OTEL layer is now added by Lambda Monitoring Aspect to avoid duplicates
    // The aspect handles both OTEL and Datadog Extension layers consistently
    
    // Create redirect Lambda function matching serverless ui-auth
    const redirectFunction = new lambda.Function(this, 'RedirectFunction', {
      functionName: ResourceNames.resourceName(SERVICES.UI_AUTH, 'redirect', this.stage),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      timeout: Duration.seconds(60),
      memorySize: 1024,
      // Layers added by Lambda Monitoring Aspect
      environment: {
        COGNITO_USER_POOL_ID: userPoolId,
        COGNITO_CLIENT_ID: userPoolClientId,
        COGNITO_IDENTITY_POOL_ID: this.identityPool.ref,
        STAGE: this.stage,
        REGION: this.region,
        // Add OTEL configuration
        OTEL_EXPORTER_OTLP_ENDPOINT: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler'
      },
      code: lambda.Code.fromInline(`
'use strict';

exports.handler = async (event) => {
  console.log('Redirect handler invoked with event:', JSON.stringify(event));
  
  // Extract the redirect URI from the request
  const { queryStringParameters } = event;
  const redirectUri = queryStringParameters?.redirect_uri || '/';
  
  // Basic validation to prevent open redirects
  const isValidRedirect = redirectUri.startsWith('/') || 
                         redirectUri.includes('.mc-review.cms.gov') ||
                         redirectUri.includes('localhost:3000');
                         
  if (!isValidRedirect) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid redirect URI' })
    };
  }
  
  // Return redirect response
  return {
    statusCode: 302,
    headers: {
      Location: redirectUri,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  };
};`),
      description: 'Handles auth redirects for the UI'
    });
    
    // Grant basic permissions
    redirectFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:DescribeUserPool',
        'cognito-idp:ListUsers',
        'cognito-identity:DescribeIdentityPool'
      ],
      resources: [
        `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${userPoolId}`,
        `arn:aws:cognito-identity:${this.region}:${this.account}:identitypool/${this.identityPool.ref}`
      ]
    }));
    
    // Output the function ARN
    new CfnOutput(this, 'RedirectFunctionArn', {
      value: redirectFunction.functionArn,
      description: 'Auth redirect Lambda function ARN'
    });
  }

  /**
   * Create stack outputs
   */
  private createOutputs(): void {
    // Output for GitHub Actions workflow (existing format)
    new CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      description: 'Cognito Identity Pool ID'
    });

    new CfnOutput(this, 'AuthenticatedRoleArn', {
      value: this.authenticatedRole.roleArn,
      description: 'Authenticated Role ARN'
    });

    // Output for app-web cf: lookups (serverless compatibility)
    new CfnOutput(this, 'IdentityPoolIdExport', {
      value: this.identityPool.ref,
      exportName: `ui-auth-${this.stage}-IdentityPoolId`,
      description: 'Cognito Identity Pool ID for cf: lookups'
    });
  }
}