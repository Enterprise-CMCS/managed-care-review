import { CfnAccount } from 'aws-cdk-lib/aws-apigateway'
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { RemovalPolicy } from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import { BaseStack, type BaseStackProps } from '../constructs/base'

/**
 * Account-wide API Gateway configuration shared by every REST API in an AWS
 * account and region. AWS supports only one CloudWatch logging role setting per
 * account/region, so this must not be owned by an environment application stack.
 */
export class ApiGatewayAccountStack extends BaseStack {
    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            serviceName: 'api-gateway-account',
            description:
                'Account-wide API Gateway CloudWatch logging configuration',
        })

        const cloudWatchRole = new Role(this, 'ApiGatewayCloudWatchRole', {
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName(
                    'service-role/AmazonAPIGatewayPushToCloudWatchLogs' // pragma: allowlist secret
                ),
            ],
        })

        // API Gateway retains this ARN as an account setting even if the stack is
        // deleted. Retain the role so that an accidental deletion cannot break
        // access logging for every API in the account.
        cloudWatchRole.applyRemovalPolicy(RemovalPolicy.RETAIN)

        new CfnAccount(this, 'ApiGatewayAccount', {
            cloudWatchRoleArn: cloudWatchRole.roleArn,
        })
    }
}
