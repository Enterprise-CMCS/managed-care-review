import { CfnOutput, Duration } from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import * as iam from 'aws-cdk-lib/aws-iam'
import { BaseStack, type BaseStackProps } from '../constructs/base'

export interface GitHubOidcServiceRoleStackProps extends BaseStackProps {}

/**
 * Stack for creating GitHub Actions OIDC service role for a specific stage
 *
 * This creates only the stage-specific service role, not the OIDC provider.
 * The OIDC provider already exists and is shared across all stages.
 *
 * Mirrors the behavior of services/github-oidc/serverless.yml but using CDK.
 */
export class GitHubOidcServiceRoleStack extends BaseStack {
    public readonly serviceRole: iam.Role

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

        // Reference the existing OIDC provider (created 2 years ago)
        const existingOidcProviderArn = `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`

        // Determine subject claim based on stage (matching Serverless logic)
        const subjectClaim = ['val', 'prod'].includes(this.stage)
            ? `repo:Enterprise-CMCS/managed-care-review:environment:${this.stage}`
            : 'repo:Enterprise-CMCS/managed-care-review:environment:dev'

        // Create the stage-specific service role (CDK version to avoid Serverless conflict)
        this.serviceRole = new iam.Role(this, 'GitHubActionsServiceRole', {
            roleName: `github-oidc-cdk-${this.stage}-ServiceRole`,
            assumedBy: new iam.WebIdentityPrincipal(existingOidcProviderArn, {
                StringEquals: {
                    'token.actions.githubusercontent.com:sub': subjectClaim,
                    'token.actions.githubusercontent.com:aud':
                        'sts.amazonaws.com',
                },
            }),
            description: `GitHub OIDC service role for ${this.stage} stage`,
            maxSessionDuration: Duration.hours(2),
            // CMS IAM requirements
            path: '/delegatedadmin/developer/',
            permissionsBoundary: iam.ManagedPolicy.fromManagedPolicyArn(
                this,
                'PermissionsBoundary',
                `arn:aws:iam::${this.account}:policy/cms-cloud-admin/ct-ado-poweruser-permissions-boundary-policy`
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
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: allowedActions,
                resources: ['*'],
            })
        )

        // Add cross-account assume role permission (from Serverless)
        this.serviceRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['sts:AssumeRole'],
                resources: [
                    `arn:aws:iam::${this.account}:role/delegatedadmin/developer/ct-cmcs-mac-fc-dso-metrics-report-events-role`,
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
