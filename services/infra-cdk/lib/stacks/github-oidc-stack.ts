import type { StackProps } from 'aws-cdk-lib'
import { Stack, CfnOutput, Duration } from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import * as iam from 'aws-cdk-lib/aws-iam'

export interface GitHubOidcStackProps extends StackProps {
    stage: string
}

/**
 * Stack for setting up GitHub Actions OIDC authentication
 * Creates OIDC provider (once per account) and stage-specific role
 * Replaces the serverless github-oidc service
 */
export class GitHubOidcStack extends Stack {
    public readonly deployRole: iam.Role

    constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
        super(scope, id, props)

        // Determine subject claim based on stage (matching serverless logic)
        const getSubjectClaim = (stage: string): string => {
            if (stage === 'val') {
                return 'repo:Enterprise-CMCS/managed-care-review:environment:val'
            } else if (stage === 'prod') {
                return 'repo:Enterprise-CMCS/managed-care-review:environment:prod'
            } else {
                // catchall for feature stages and the main stage
                return 'repo:Enterprise-CMCS/managed-care-review:environment:dev'
            }
        }

        // Only create OIDC provider for main, val, or prod stages to avoid duplicates
        let gitHubProvider: iam.OpenIdConnectProvider | undefined
        const shouldCreateProvider = ['main', 'val', 'prod'].includes(
            props.stage
        )

        if (shouldCreateProvider) {
            gitHubProvider = new iam.OpenIdConnectProvider(
                this,
                'GitHubOIDCProvider',
                {
                    url: 'https://token.actions.githubusercontent.com',
                    clientIds: ['sts.amazonaws.com'],
                    thumbprints: [
                        '6938fd4d98bab03faadb97b34396831e3780aea1',
                        '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
                    ],
                }
            )
        }

        // Get OIDC provider ARN (either newly created or existing)
        const oidcProviderArn = gitHubProvider
            ? gitHubProvider.openIdConnectProviderArn
            : `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`

        // Create the deployment role matching serverless naming convention
        this.deployRole = new iam.Role(this, 'GitHubActionsServiceRole', {
            roleName: `github-oidc-${props.stage}-ServiceRole`,
            assumedBy: new iam.WebIdentityPrincipal(oidcProviderArn, {
                StringEquals: {
                    'token.actions.githubusercontent.com:sub': getSubjectClaim(
                        props.stage
                    ),
                    'token.actions.githubusercontent.com:aud':
                        'sts.amazonaws.com',
                },
            }),
            description: `Role for GitHub Actions OIDC stage ${props.stage}`,
            maxSessionDuration: Duration.hours(2),
            path: '/delegatedadmin/developer/',
            permissionsBoundary: iam.ManagedPolicy.fromManagedPolicyArn(
                this,
                'PermissionsBoundary',
                `arn:aws:iam::${this.account}:policy/cms-cloud-admin/ct-ado-poweruser-permissions-boundary-policy`
            ),
        })

        // Add GitHub Actions permissions matching serverless configuration
        this.deployRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
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
                ],
                resources: ['*'],
            })
        )

        // Add permission to assume the DSO metrics reporting role
        this.deployRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['sts:AssumeRole'],
                resources: [
                    `arn:aws:iam::${this.account}:role/delegatedadmin/developer/ct-cmcs-mac-fc-dso-metrics-report-events-role`,
                ],
            })
        )

        // Output the role ARN for reference
        new CfnOutput(this, 'GitHubOidcRoleArn', {
            value: this.deployRole.roleArn,
            description: `GitHub OIDC role ARN for stage ${props.stage}`,
            exportName: `GitHubOidcRole-${props.stage}`,
        })

        // Output the role name matching get_aws_credentials expectations
        new CfnOutput(this, 'GitHubOidcRoleName', {
            value: this.deployRole.roleName,
            description: `GitHub OIDC role name for stage ${props.stage}`,
        })
    }
}
