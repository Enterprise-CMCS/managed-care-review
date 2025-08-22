import { Stack, type StackProps, CfnOutput, Duration } from 'aws-cdk-lib'
import { type Construct } from 'constructs'
import * as iam from 'aws-cdk-lib/aws-iam'

/**
 * Stack for setting up GitHub Actions OIDC authentication
 * This is a one-time setup per AWS account
 *
 * NOTE: This stack is currently DISABLED in favor of using the existing
 * serverless OIDC setup at services/github-oidc/serverless.yml
 * to avoid creating duplicate OIDC providers (only one allowed per AWS account).
 * The CDK deployments use the serverless OIDC role via the get_aws_credentials GitHub Action.
 */
export class GitHubOidcStack extends Stack {
    public readonly deployRole: iam.Role

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props)

        // Create the OIDC provider for GitHub Actions
        const gitHubProvider = new iam.OpenIdConnectProvider(
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

        // Create the deployment role that GitHub Actions will assume
        this.deployRole = new iam.Role(this, 'GitHubActionsDeployRole', {
            roleName: 'GitHubActionsDeployRole-MCR',
            assumedBy: new iam.WebIdentityPrincipal(
                gitHubProvider.openIdConnectProviderArn,
                {
                    StringEquals: {
                        'token.actions.githubusercontent.com:aud':
                            'sts.amazonaws.com',
                    },
                    StringLike: {
                        'token.actions.githubusercontent.com:sub': [
                            'repo:Enterprise-CMCS/managed-care-review:ref:refs/heads/main',
                            'repo:Enterprise-CMCS/managed-care-review:ref:refs/heads/feat/*',
                            'repo:Enterprise-CMCS/managed-care-review:pull_request',
                        ],
                    },
                }
            ),
            description: 'Role for GitHub Actions to deploy MCR CDK stacks',
            maxSessionDuration: Duration.hours(2),
            managedPolicies: [
                // PowerUserAccess allows most AWS actions except IAM
                iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'),
            ],
        })

        // Add specific IAM permissions needed for CDK deployments
        this.deployRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'iam:CreateRole',
                    'iam:DeleteRole',
                    'iam:AttachRolePolicy',
                    'iam:DetachRolePolicy',
                    'iam:PutRolePolicy',
                    'iam:DeleteRolePolicy',
                    'iam:CreatePolicy',
                    'iam:DeletePolicy',
                    'iam:CreatePolicyVersion',
                    'iam:DeletePolicyVersion',
                    'iam:GetRole',
                    'iam:GetRolePolicy',
                    'iam:GetPolicy',
                    'iam:GetPolicyVersion',
                    'iam:ListRolePolicies',
                    'iam:ListAttachedRolePolicies',
                    'iam:ListPolicyVersions',
                    'iam:PassRole',
                    'iam:TagRole',
                    'iam:UntagRole',
                    'iam:CreateInstanceProfile',
                    'iam:DeleteInstanceProfile',
                    'iam:AddRoleToInstanceProfile',
                    'iam:RemoveRoleFromInstanceProfile',
                    'iam:GetInstanceProfile',
                    'iam:ListInstanceProfiles',
                    'iam:ListInstanceProfilesForRole',
                ],
                resources: ['*'],
                conditions: {
                    StringEquals: {
                        'aws:RequestedRegion': Stack.of(this).region,
                    },
                },
            })
        )

        // Add permissions for CloudFormation to create service-linked roles
        this.deployRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'iam:CreateServiceLinkedRole',
                    'iam:DeleteServiceLinkedRole',
                    'iam:GetServiceLinkedRoleDeletionStatus',
                ],
                resources: ['*'],
            })
        )

        // Output the role ARN for use in GitHub Actions
        new CfnOutput(this, 'DeployRoleArn', {
            value: this.deployRole.roleArn,
            description: 'ARN of the role for GitHub Actions to assume',
            exportName: 'GitHubActionsDeployRoleArn',
        })

        // Output instructions for setting up GitHub secrets
        new CfnOutput(this, 'SetupInstructions', {
            value: `Add the following secrets to your GitHub repository:
        - AWS_ACCOUNT_ID: ${Stack.of(this).account}
        - DEPLOY_ROLE_ARN: ${this.deployRole.roleArn}`,
            description: 'Instructions for GitHub repository setup',
        })
    }
}
