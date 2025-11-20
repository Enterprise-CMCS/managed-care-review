import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import { type Construct } from 'constructs'
import {
    UserPool,
    UserPoolClient,
    UserPoolDomain,
    UserPoolIdentityProviderSaml,
    CfnIdentityPool,
    CfnIdentityPoolRoleAttachment,
    UserPoolClientIdentityProvider,
    StringAttribute,
    UserPoolEmail,
    OAuthScope,
    ProviderAttribute,
    UserPoolIdentityProviderSamlMetadataType,
} from 'aws-cdk-lib/aws-cognito'
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
    public readonly userPool: UserPool
    public readonly userPoolClient: UserPoolClient
    public readonly userPoolDomain: UserPoolDomain
    public readonly identityPool: CfnIdentityPool
    public readonly authRole: Role

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            description: 'Cognito authentication - User Pool and Identity Pool',
        })

        // Import application endpoint URL from frontend-infra stack (matches serverless ui-auth dependency on ui)
        const applicationEndpointUrl = Fn.importValue(
            `frontend-infra-${props.stage}-cdk-CloudFrontEndpointUrl`
        )

        // Get SSM parameters (matches serverless config)
        const oktaMetadataUrl = StringParameter.valueFromLookup(
            this,
            '/configuration/okta_metadata_url'
        )

        const sesSourceEmail = StringParameter.valueFromLookup(
            this,
            '/configuration/email/sourceAddress'
        )

        // Create Cognito User Pool (matches serverless ui-auth)
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
            email:
                sesSourceEmail !== 'dummy-value-for-'
                    ? UserPoolEmail.withSES({
                          sesRegion: this.region,
                          fromEmail: sesSourceEmail,
                          fromName: 'Managed Care Review',
                      })
                    : UserPoolEmail.withCognito(),
        })

        // Create SAML Identity Provider (Okta)
        const identityProvider = new UserPoolIdentityProviderSaml(
            this,
            'CognitoUserPoolIdentityProvider',
            {
                userPool: this.userPool,
                name: 'Okta',
                metadata: {
                    metadataType: UserPoolIdentityProviderSamlMetadataType.URL,
                    metadataContent: oktaMetadataUrl,
                },
                attributeMapping: {
                    email: ProviderAttribute.other(
                        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
                    ),
                    custom: {
                        'custom:state_code': ProviderAttribute.other('state'),
                        'custom:role': ProviderAttribute.other('cmsRoles'),
                    },
                    givenName: ProviderAttribute.other('firstName'),
                    familyName: ProviderAttribute.other('lastName'),
                },
                idpSignout: true,
            }
        )

        // Create User Pool Client (matches serverless config)
        this.userPoolClient = new UserPoolClient(
            this,
            'CognitoUserPoolClient',
            {
                userPool: this.userPool,
                userPoolClientName: `${this.stage}-user-pool-client`,
                oAuth: {
                    flows: {
                        implicitCodeGrant: true,
                    },
                    scopes: [OAuthScope.EMAIL, OAuthScope.OPENID],
                    callbackUrls: [
                        applicationEndpointUrl, // Dynamic URL from frontend-infra stack
                        'http://localhost:3000/',
                        'http://localhost:3003/',
                    ],
                    logoutUrls: [
                        applicationEndpointUrl, // Dynamic URL from frontend-infra stack
                        'http://localhost:3000/',
                        'http://localhost:3003/',
                    ],
                },
                authFlows: {
                    adminUserPassword: true,
                    userSrp: true,
                },
                generateSecret: false,
                supportedIdentityProviders: [
                    UserPoolClientIdentityProvider.custom('Okta'),
                ],
            }
        )

        // Add dependency to ensure identity provider is created first
        this.userPoolClient.node.addDependency(identityProvider)

        // Create User Pool Domain
        this.userPoolDomain = new UserPoolDomain(this, 'UserPoolDomain', {
            userPool: this.userPool,
            cognitoDomain: {
                domainPrefix: `${this.stage}-login-${this.userPoolClient.userPoolClientId}`,
            },
        })

        // Create Identity Pool
        this.identityPool = new CfnIdentityPool(this, 'CognitoIdentityPool', {
            identityPoolName: `${this.stage}IdentityPool`,
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: this.userPoolClient.userPoolClientId,
                    providerName: this.userPool.userPoolProviderName,
                },
            ],
        })

        // Create authenticated role for Identity Pool (matches serverless config)
        this.authRole = new Role(this, 'CognitoAuthRole', {
            assumedBy: new WebIdentityPrincipal(
                'cognito-identity.amazonaws.com',
                {
                    StringEquals: {
                        'cognito-identity.amazonaws.com:aud':
                            this.identityPool.ref,
                    },
                    'ForAnyValue:StringLike': {
                        'cognito-identity.amazonaws.com:amr': 'authenticated',
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
                    `arn:aws:execute-api:${this.region}:${this.account}:*/*`, // Will be constrained by actual API Gateway
                ],
            })
        )

        // S3 permissions for uploads (will be constrained by actual bucket ARNs)
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
        new CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
            identityPoolId: this.identityPool.ref,
            roles: {
                authenticated: this.authRole.roleArn,
            },
        })

        this.createOutputs()
    }

    private createOutputs(): void {
        // TEMPORARY: For dev/val/prod, export Serverless Cognito IDs from SSM
        // For review environments, use the new CDK Cognito resources
        //
        // This allows:
        // - dev/val/prod: Continue using existing Serverless Cognito (with Okta configured)
        // - review envs: Use new CDK Cognito with test users (isolated per PR)
        //
        // Migration plan:
        // 1. Now: Dev/val/prod envs use Serverless Cognito, review envs use CDK Cognito
        // 2. Later: Update Okta to point to new CDK Cognito endpoints
        // 3. Later: Change all envs to use CDK Cognito (remove conditional logic)
        // 4. Later: Delete Serverless Cognito resources

        const isDevValProd = ['dev', 'val', 'prod'].includes(this.stage)

        let userPoolId: string
        let userPoolClientId: string
        let identityPoolId: string
        let userPoolDomain: string
        let description: string

        if (isDevValProd) {
            // Dev/Val/Prod environments: Read from SSM (Serverless Cognito)
            userPoolId = StringParameter.valueFromLookup(
                this,
                `/cognito/${this.stage}/user_pool_id`
            )
            userPoolClientId = StringParameter.valueFromLookup(
                this,
                `/cognito/${this.stage}/user_pool_client_id`
            )
            identityPoolId = StringParameter.valueFromLookup(
                this,
                `/cognito/${this.stage}/identity_pool_id`
            )
            userPoolDomain = StringParameter.valueFromLookup(
                this,
                `/cognito/${this.stage}/user_pool_domain`
            )
            description = 'from Serverless via SSM'
        } else {
            // Review environments: Use new CDK Cognito
            userPoolId = this.userPool.userPoolId
            userPoolClientId = this.userPoolClient.userPoolClientId
            identityPoolId = this.identityPool.ref
            userPoolDomain = `${this.userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`
            description = 'from CDK Cognito'
        }

        new CfnOutput(this, 'UserPoolId', {
            value: userPoolId,
            exportName: this.exportName('UserPoolId'),
            description: `Cognito User Pool ID (${description})`,
        })

        new CfnOutput(this, 'UserPoolClientId', {
            value: userPoolClientId,
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
            value: `urn:amazon:cognito:sp:${userPoolId}`,
            exportName: this.exportName('AudienceRestrictionURI'),
            description: `Cognito SAML Audience Restriction URI (${description})`,
        })

        new CfnOutput(this, 'IdentityPoolId', {
            value: identityPoolId,
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
