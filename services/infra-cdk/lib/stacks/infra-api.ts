import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import { type Construct } from 'constructs'
import {
    RestApi,
    GatewayResponse,
    ResponseType,
} from 'aws-cdk-lib/aws-apigateway'
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2'
import { CfnOutput } from 'aws-cdk-lib'
import { ResourceNames } from '../config'

/**
 * Infrastructure API stack - provides core API Gateway and WAF
 * Matches the infra-api serverless service functionality
 */
export class InfraApiStack extends BaseStack {
    public readonly apiGateway: RestApi
    public readonly webAcl: CfnWebACL
    public readonly apiGatewayUrl: string

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            description: 'Infrastructure API - Core API Gateway and WAF',
        })

        // Create API Gateway (matches serverless infra-api)
        this.apiGateway = new RestApi(this, 'AppApiGateway', {
            restApiName: `${ResourceNames.apiName('infra-api', this.stage)}-app-api-gateway`,
            description: 'Core API Gateway for app-api service',
            deploy: true,
            deployOptions: {
                stageName: this.stage,
            },
        })

        this.apiGatewayUrl = `https://${this.apiGateway.restApiId}.execute-api.${this.region}.amazonaws.com/${this.stage}`

        // Add CORS gateway responses (matches serverless config)
        new GatewayResponse(this, 'GatewayResponseDefault4XX', {
            restApi: this.apiGateway,
            type: ResponseType.DEFAULT_4XX,
            responseHeaders: {
                'Access-Control-Allow-Origin': "'*'",
                'Access-Control-Allow-Headers': "'*'",
            },
        })

        new GatewayResponse(this, 'GatewayResponseDefault5XX', {
            restApi: this.apiGateway,
            type: ResponseType.DEFAULT_5XX,
            responseHeaders: {
                'Access-Control-Allow-Origin': "'*'",
                'Access-Control-Allow-Headers': "'*'",
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

        this.createOutputs()
    }

    private createOutputs(): void {
        // API Gateway outputs (required by app-api and ui-auth)
        new CfnOutput(this, 'ApiGatewayRestApiId', {
            value: this.apiGateway.restApiId,
            exportName: this.exportName('ApiGatewayRestApiId'),
            description: 'API Gateway REST API ID',
        })

        new CfnOutput(this, 'ApiGatewayRestApiUrl', {
            value: this.apiGatewayUrl,
            exportName: this.exportName('ApiGatewayRestApiUrl'),
            description: 'API Gateway REST API URL',
        })

        new CfnOutput(this, 'AppApiGatewayRootResourceId', {
            value: this.apiGateway.restApiRootResourceId,
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
