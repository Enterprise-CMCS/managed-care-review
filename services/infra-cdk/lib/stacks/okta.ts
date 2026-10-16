import { CfnOutput } from 'aws-cdk-lib'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import type { Construct } from 'constructs'
import { isReviewEnvironment } from '../config/environments'
import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'

/**
 * Stores CI-provided Okta configuration for the OIDC migration.
 */
export class OktaStack extends BaseStack {
    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            serviceName: 'okta',
            description: 'Okta OIDC configuration in SSM Parameter Store',
        })

        const placeholderPrefix = isReviewEnvironment(this.stage)
            ? 'REVIEW'
            : this.stage === 'dev'
              ? 'DEV'
              : undefined

        for (const [outputName, parameterName, varName] of [
            ['Issuer', 'issuer', 'OKTA_ISSUER'],
            ['ClientId', 'client_id', 'OKTA_CLIENT_ID'],
            ['Audience', 'audience', 'OKTA_AUDIENCE'],
        ]) {
            const value =
                process.env[varName]?.trim() ||
                (placeholderPrefix
                    ? `${placeholderPrefix}_PLACEHOLDER_${varName}`
                    : undefined)
            if (!value) {
                throw new Error(
                    `${varName} is required to deploy the Okta stack`
                )
            }

            // Each stack owns its parameters, even when CI supplies the same
            // Okta application values for QA/Val or review/Dev environments.
            const parameter = new StringParameter(
                this,
                `${outputName}Parameter`,
                {
                    parameterName: `/okta/${this.stage}/${parameterName}`,
                    stringValue: value,
                }
            )

            new CfnOutput(this, outputName, {
                value: parameter.stringValue,
                exportName: this.exportName(outputName),
            })
        }
    }
}
