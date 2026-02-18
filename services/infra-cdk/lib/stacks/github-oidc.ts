import { CfnOutput, Duration } from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import {
    Role,
    WebIdentityPrincipal,
    ManagedPolicy,
    PolicyStatement,
    Effect,
    OpenIdConnectProvider,
} from 'aws-cdk-lib/aws-iam'
import { BaseStack, type BaseStackProps } from '../constructs/base'

// CMS IAM permissions boundary requirement
const PERMISSION_BOUNDARY_ARN = (accountId: string) =>
    `arn:aws:iam::${accountId}:policy/cms-cloud-admin/ct-ado-poweruser-permissions-boundary-policy`

// Official stages own the OIDC provider in their respective AWS account.
// Review branch stacks reference the provider created by the dev stack.
const OFFICIAL_STAGES = ['dev', 'val', 'prod']

// GitHub thumbprints from https://github.blog/changelog/2022-01-13-github-actions-update-on-oidc-based-deployments-to-aws/
const GITHUB_THUMBPRINTS = [
    '6938fd4d98bab03faadb97b34396831e3780aea1',
    '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
]

export interface GitHubOidcServiceRoleStackProps extends BaseStackProps {}

/**
 * Stack for creating GitHub Actions OIDC service role for a specific stage.
 *
 * For official stages (dev, val, prod), this also creates the IAM OIDC Identity
 * Provider - one per AWS account. Review branch stacks reference the existing
 * provider created by the dev stage stack in the same account.
 */
export class GitHubOidcServiceRoleStack extends BaseStack {
    public readonly serviceRole: Role

    constructor(
        scope: Construct,
        id: string,
        props: GitHubOidcServiceRoleStackProps
    ) {
        super(scope, id, {
            ...props,
            description:
                props.description ||
                `GitHub OIDC service role for ${props.stage} stage`,
        })

        const isOfficialStage = OFFICIAL_STAGES.includes(this.stage)

        // Official stages create the OIDC provider (one per AWS account).
        // Review branch stacks reference the provider owned by the dev stack.
        const oidcProvider = isOfficialStage
            ? new OpenIdConnectProvider(this, 'GitHubOidcProvider', {
                  url: 'https://token.actions.githubusercontent.com',
                  clientIds: ['sts.amazonaws.com'],
                  thumbprints: GITHUB_THUMBPRINTS,
              })
            : OpenIdConnectProvider.fromOpenIdConnectProviderArn(
                  this,
                  'GitHubOidcProvider',
                  `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`
              )

        const oidcProviderArn = oidcProvider.openIdConnectProviderArn

        // Determine subject claim based on stage (matching Serverless logic)
        const subjectClaim = ['val', 'prod'].includes(this.stage)
            ? `repo:Enterprise-CMCS/managed-care-review:environment:${this.stage}`
            : 'repo:Enterprise-CMCS/managed-care-review:environment:dev'

        // Create the stage-specific service role (CDK version to avoid Serverless conflict)
        this.serviceRole = new Role(this, 'GitHubActionsServiceRole', {
            roleName: `github-oidc-cdk-${this.stage}-ServiceRole`,
            assumedBy: new WebIdentityPrincipal(oidcProviderArn, {
                StringEquals: {
                    'token.actions.githubusercontent.com:sub': subjectClaim,
                    'token.actions.githubusercontent.com:aud':
                        'sts.amazonaws.com',
                },
            }),
            description: `GitHub OIDC service role for ${this.stage} stage`,
            maxSessionDuration: Duration.hours(2),
            // CMS IAM requirements - OIDC role needs both path and permissions boundary
            path: '/delegatedadmin/developer/',
            permissionsBoundary: ManagedPolicy.fromManagedPolicyArn(
                this,
                'PermissionsBoundary',
                PERMISSION_BOUNDARY_ARN(this.account)
            ),
        })

        // Add the same permissions as Serverless version
        const allowedActions = [
            'acm:*',
            'apigateway:*',
            'cloudformation:*',
            'cloudfront:*',
            'cloudwatch:*',
            'cognito-identity:*',
            'cognito-idp:*',
            'ec2:*',
            'ecr:*',
            'events:*',
            'firehose:*',
            'guardduty:*',
            'iam:*',
            'kms:*',
            'lambda:*',
            'logs:*',
            'route53:*',
            'rds:*',
            'secretsmanager:*',
            'ssm:*',
            's3:*',
            'tag:*',
            'wafv2:*',
            'securityhub:*',
        ]

        this.serviceRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: allowedActions,
                resources: ['*'],
            })
        )

        // Add cross-account assume role permission (from Serverless)
        this.serviceRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['sts:AssumeRole'],
                resources: [
                    `arn:aws:iam::${this.account}:role/delegatedadmin/developer/ct-cmcs-mac-fc-dso-metrics-report-events-role`,
                ],
            })
        )

        // Add permission to assume CDK bootstrap roles
        this.serviceRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['sts:AssumeRole'],
                resources: [
                    `arn:aws:iam::${this.account}:role/cdk-*-lookup-role-${this.account}-*`,
                    `arn:aws:iam::${this.account}:role/cdk-*-deploy-role-${this.account}-*`,
                    `arn:aws:iam::${this.account}:role/cdk-*-file-publishing-role-${this.account}-*`,
                    `arn:aws:iam::${this.account}:role/cdk-*-image-publishing-role-${this.account}-*`,
                ],
            })
        )

        // Output the role ARN for verification
        new CfnOutput(this, 'ServiceRoleArn', {
            value: this.serviceRole.roleArn,
            description: `GitHub OIDC service role ARN for ${this.stage} stage`,
            exportName: this.exportName('ServiceRoleArn'),
        })
    }
}
