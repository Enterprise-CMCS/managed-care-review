import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import { type Construct } from 'constructs'
import { CfnRestApi, CfnGatewayResponse } from 'aws-cdk-lib/aws-apigateway'
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2'
import { CfnOutput } from 'aws-cdk-lib'
import { ResourceNames } from '../config'

/**
 * Infrastructure API stack - provides core API Gateway and WAF
 * Matches the infra-api serverless service functionality
 */
export class InfraApiStack extends BaseStack {
    public readonly apiGateway: CfnRestApi
    public readonly webAcl: CfnWebACL
    public readonly apiGatewayUrl: string

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            description: 'Infrastructure API - Core API Gateway and WAF',
        })

        // Create API Gateway (matches serverless infra-api exactly)
        this.apiGateway = new CfnRestApi(this, 'AppApiGateway', {
            name: `${ResourceNames.apiName('infra-api', this.stage)}-app-api-gateway`,
            description: 'Core API Gateway for app-api service',
        })

        this.apiGatewayUrl = `https://${this.apiGateway.ref}.execute-api.${this.region}.amazonaws.com/${this.stage}`

        // Add CORS gateway responses (matches serverless config)
        new CfnGatewayResponse(this, 'GatewayResponseDefault4XX', {
            restApiId: this.apiGateway.ref,
            responseType: 'DEFAULT_4XX',
            responseParameters: {
                'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.Access-Control-Allow-Headers': "'*'",
            },
        })

        new CfnGatewayResponse(this, 'GatewayResponseDefault5XX', {
            restApiId: this.apiGateway.ref,
            responseType: 'DEFAULT_5XX',
            responseParameters: {
                'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.Access-Control-Allow-Headers': "'*'",
            },
        })

        // Create WAF Web ACL (matches serverless waf plugin)
        this.webAcl = new CfnWebACL(this, 'WafPluginAcl', {
            scope: 'REGIONAL',
            defaultAction: { allow: {} },
            name: `${this.stage}-infra-api-webacl`,
            rules: [
                {
                    name: `${this.stage}-AWS-AWSManagedRulesCommonRuleSet`,
                    priority: 1,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesCommonRuleSet',
                            excludedRules: [
                                {
                                    name: 'SizeRestrictions_BODY',
                                },
                            ],
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'CommonRuleSetMetric',
                    },
                },
            ],
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                sampledRequestsEnabled: true,
                metricName: `${this.stage}-webacl`,
            },
        })

        // No methods needed - app-api service will add them later
        // Using CfnRestApi bypasses CDK's validation requirement

        this.createOutputs()
    }

    private createOutputs(): void {
        // API Gateway outputs (required by app-api and ui-auth)
        new CfnOutput(this, 'ApiGatewayRestApiId', {
            value: this.apiGateway.ref,
            exportName: this.exportName('ApiGatewayRestApiId'),
            description: 'API Gateway REST API ID',
        })

        new CfnOutput(this, 'ApiGatewayRestApiUrl', {
            value: this.apiGatewayUrl,
            exportName: this.exportName('ApiGatewayRestApiUrl'),
            description: 'API Gateway REST API URL',
        })

        new CfnOutput(this, 'AppApiGatewayRootResourceId', {
            value: this.apiGateway.attrRootResourceId,
            exportName: this.exportName('AppApiGatewayRootResourceId'),
            description: 'API Gateway root resource ID',
        })

        // WAF output (required by app-api)
        new CfnOutput(this, 'WafPluginAclArn', {
            value: this.webAcl.attrArn,
            exportName: this.exportName('WafPluginAclArn'),
            description: 'WAF Web ACL ARN for API protection',
        })
    }
}
