import { CfnOutput, CfnWaitConditionHandle } from 'aws-cdk-lib'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import type { Construct } from 'constructs'
import { isReviewEnvironment } from '../config/environments'
import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'

/**
 * References externally provisioned Okta configuration for the OIDC migration.
 */
export class OktaStack extends BaseStack {
    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            serviceName: 'okta',
            description: 'Okta OIDC configuration from SSM Parameter Store',
        })

        // QA shares Val's account and Okta app; reviews use Dev until the
        // dedicated CI authentication application is introduced.
        const sourceStage = isReviewEnvironment(this.stage)
            ? 'dev'
            : this.stage === 'qa'
              ? 'val'
              : this.stage

        // CloudFormation requires at least one resource, even for an
        // outputs-only stack. This handle does not wait for any signals.
        new CfnWaitConditionHandle(this, 'ConfigurationHandle')

        for (const [outputName, parameterName] of [
            ['Issuer', 'issuer'],
            ['ClientId', 'client_id'],
            ['Audience', 'audience'],
        ]) {
            new CfnOutput(this, outputName, {
                value: StringParameter.valueForStringParameter(
                    this,
                    `/okta/${sourceStage}/${parameterName}`
                ),
                exportName: this.exportName(outputName),
            })
        }
    }
}
