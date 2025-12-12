import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import { type Construct } from 'constructs'
import {
    CfnIdentityPool,
    CfnIdentityPoolRoleAttachment,
    StringAttribute,
    UserPool,
    UserPoolDomain,
    UserPoolClient,
    UserPoolEmail,
} from 'aws-cdk-lib/aws-cognito'
import type { IUserPool, IUserPoolClient } from 'aws-cdk-lib/aws-cognito'
import {
    Role,
    WebIdentityPrincipal,
    PolicyStatement,
    Effect,
} from 'aws-cdk-lib/aws-iam'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import { CfnOutput, Fn } from 'aws-cdk-lib'

/**
 * Cognito stack - User Pool and Identity Pool for authentication
 */
export class CognitoStack extends BaseStack {
    public readonly userPool: IUserPool
    public readonly userPoolClient: IUserPoolClient
    public readonly userPoolDomain?: UserPoolDomain // Only created for review envs
    public readonly identityPool: CfnIdentityPool | { ref: string } // Full resource for review, ref-only for dev/val/prod
    public readonly authRole?: Role // Only created for review envs

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            description: 'Cognito authentication - User Pool and Identity Pool',
        })

        const isDevValProd = ['dev', 'val', 'prod'].includes(this.stage)

        if (isDevValProd) {
            // Dev/Val/Prod: Import existing Cognito resources previously deployed by serverless
            // These resources aren't managed by CDK and we reference them here
            const userPoolId = StringParameter.valueFromLookup(
                this,
                `/cognito/${this.stage}/user_pool_id`
            )

            const userPoolClientId = StringParameter.valueFromLookup(
                this,
                `/cognito/${this.stage}/user_pool_client_id`
            )

            const identityPoolId = StringParameter.valueFromLookup(
                this,
                `/cognito/${this.stage}/identity_pool_id`
            )

            // Import existing resources (read-only references)
            this.userPool = UserPool.fromUserPoolId(
                this,
                'ImportedUserPool',
                userPoolId
            )

            this.userPoolClient = UserPoolClient.fromUserPoolClientId(
                this,
                'ImportedUserPoolClient',
                userPoolClientId
            )

            // Identity Pool - only need the ref (ID) for dev/val/prod
            // The actual resource is managed outside CDK (created by Serverless)
            this.identityPool = {
                ref: identityPoolId,
            }

            // Auth role exists in AWS but we don't need to reference it here
            // It's managed outside of CDK (created by Serverless)
        } else {
            // Review environments: Create simple Cognito for test users (no Okta SAML)
            // Review environments use direct username/password authentication with test users

            // Create Cognito User Pool
            this.userPool = new UserPool(this, 'CognitoUserPool', {
                userPoolName: `${this.stage}-user-pool`,
                signInAliases: {
                    email: true,
                },
                autoVerify: {
                    email: true,
                },
                standardAttributes: {
                    givenName: {
                        required: false,
                        mutable: true,
                    },
                    familyName: {
                        required: false,
                        mutable: true,
                    },
                    phoneNumber: {
                        required: false,
                        mutable: true,
                    },
                },
                customAttributes: {
                    state_code: new StringAttribute({
                        mutable: true,
                    }),
                    role: new StringAttribute({
                        mutable: true,
                    }),
                },
                selfSignUpEnabled: false,
                // Use Cognito's default email (not SES) for review environments
                email: UserPoolEmail.withCognito(),
            })

            // Create User Pool Client with direct authentication (no OAuth/SAML)
            this.userPoolClient = new UserPoolClient(
                this,
                'CognitoUserPoolClient',
                {
                    userPool: this.userPool,
                    userPoolClientName: `${this.stage}-user-pool-client`,
                    authFlows: {
                        adminUserPassword: true, // Allow admin to create test users
                        userPassword: true, // Username/password authentication
                        userSrp: true, // Secure Remote Password protocol
                    },
                    generateSecret: false,
                    // No OAuth or SAML - direct authentication only
                }
            )

            // Create User Pool Domain
            this.userPoolDomain = new UserPoolDomain(this, 'UserPoolDomain', {
                userPool: this.userPool,
                cognitoDomain: {
                    domainPrefix: Fn.join('', [
                        `${this.stage}-login-`,
                        this.userPoolClient.userPoolClientId,
                    ]),
                },
            })

            // Add explicit dependency to ensure client is created first
            this.userPoolDomain.node.addDependency(this.userPoolClient)

            // Create Identity Pool
            this.identityPool = new CfnIdentityPool(
                this,
                'CognitoIdentityPool',
                {
                    identityPoolName: `${this.stage}IdentityPool`,
                    allowUnauthenticatedIdentities: false,
                    cognitoIdentityProviders: [
                        {
                            clientId: this.userPoolClient.userPoolClientId,
                            providerName: this.userPool.userPoolProviderName,
                        },
                    ],
                }
            )

            // Create authenticated role for Identity Pool
            this.authRole = new Role(this, 'CognitoAuthRole', {
                assumedBy: new WebIdentityPrincipal(
                    'cognito-identity.amazonaws.com',
                    {
                        StringEquals: {
                            'cognito-identity.amazonaws.com:aud':
                                this.identityPool.ref,
                        },
                        'ForAnyValue:StringLike': {
                            'cognito-identity.amazonaws.com:amr':
                                'authenticated',
                        },
                    }
                ),
            })

            // Add policies to auth role
            this.authRole.addToPolicy(
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        'mobileanalytics:PutEvents',
                        'cognito-sync:*',
                        'cognito-identity:*',
                    ],
                    resources: ['*'],
                })
            )

            this.authRole.addToPolicy(
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ['execute-api:Invoke'],
                    resources: [
                        `arn:aws:execute-api:${this.region}:${this.account}:*/*`,
                    ],
                })
            )

            // S3 permissions for uploads
            this.authRole.addToPolicy(
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ['s3:*'],
                    resources: [
                        'arn:aws:s3:::*/allusers/*',
                        `arn:aws:s3:::*/private/\${cognito-identity.amazonaws.com:sub}/*`,
                    ],
                })
            )

            // Attach the authenticated role to the Identity Pool
            new CfnIdentityPoolRoleAttachment(
                this,
                'IdentityPoolRoleAttachment',
                {
                    identityPoolId: this.identityPool.ref,
                    roles: {
                        authenticated: this.authRole.roleArn,
                    },
                }
            )
        }

        this.createOutputs()
    }

    private createOutputs(): void {
        // Export Cognito resource IDs for use by other stacks
        // - dev/val/prod: References existing Serverless-deployed Cognito (imported via SSM)
        // - review envs: References CDK-created Cognito resources

        const isDevValProd = ['dev', 'val', 'prod'].includes(this.stage)
        const description = isDevValProd
            ? 'from Serverless (imported)'
            : 'from CDK'

        const userPoolDomain = isDevValProd
            ? StringParameter.valueFromLookup(
                  this,
                  `/cognito/${this.stage}/user_pool_domain`
              )
            : `${this.userPoolDomain!.domainName}.auth.${this.region}.amazoncognito.com`

        new CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            exportName: this.exportName('UserPoolId'),
            description: `Cognito User Pool ID (${description})`,
        })

        new CfnOutput(this, 'UserPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
            exportName: this.exportName('UserPoolClientId'),
            description: `Cognito User Pool Client ID (${description})`,
        })

        new CfnOutput(this, 'UserPoolClientDomain', {
            value: userPoolDomain,
            exportName: this.exportName('UserPoolClientDomain'),
            description: `Cognito User Pool Domain (${description})`,
        })

        new CfnOutput(this, 'UserPoolSingleSignOnURL', {
            value: `https://${userPoolDomain}/saml2/idpresponse`,
            exportName: this.exportName('UserPoolSingleSignOnURL'),
            description: `Cognito SAML SSO URL (${description})`,
        })

        new CfnOutput(this, 'AudienceRestrictionURI', {
            value: `urn:amazon:cognito:sp:${this.userPool.userPoolId}`,
            exportName: this.exportName('AudienceRestrictionURI'),
            description: `Cognito SAML Audience Restriction URI (${description})`,
        })

        new CfnOutput(this, 'IdentityPoolId', {
            value: this.identityPool.ref,
            exportName: this.exportName('IdentityPoolId'),
            description: `Cognito Identity Pool ID (${description})`,
        })

        new CfnOutput(this, 'Region', {
            value: this.region,
            exportName: this.exportName('Region'),
            description: 'AWS Region',
        })
    }
}
