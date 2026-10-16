import { ArnFormat, CfnOutput, Duration, Fn } from 'aws-cdk-lib'
import { AccessLogFormat } from 'aws-cdk-lib/aws-apigateway'
import {
    CorsHttpMethod,
    HttpApi,
    HttpMethod,
    LogGroupLogDestination,
    PayloadFormatVersion,
} from 'aws-cdk-lib/aws-apigatewayv2'
import {
    HttpJwtAuthorizer,
    HttpLambdaAuthorizer,
    HttpLambdaResponseType,
} from 'aws-cdk-lib/aws-apigatewayv2-authorizers'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import { Function } from 'aws-cdk-lib/aws-lambda'
import { LogGroup } from 'aws-cdk-lib/aws-logs'
import type { Construct } from 'constructs'
import { isReviewEnvironment } from '../config/environments'
import { ResourceNames } from '../config/shared'
import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'

/**
 * Parallel HTTP API infrastructure for the OIDC migration.
 * Shares application handlers with REST while using native Okta JWT auth.
 */
export class AppApiHttpStack extends BaseStack {
    public readonly httpApi: HttpApi

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            serviceName: 'app-api-http',
            description: 'Parallel HTTP API infrastructure for OIDC migration',
        })

        const additionalOrigins = (process.env.HTTP_API_ALLOWED_ORIGINS || '')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
        // Keep native HTTP CORS independent of the Lambda helper's shared
        // INTERNAL_ALLOWED_ORIGINS setting, which can contain suffix wildcards.
        if (additionalOrigins.some((origin) => origin.includes('*'))) {
            throw new Error(
                'HTTP_API_ALLOWED_ORIGINS must contain explicit origins; expand wildcard domains before deployment.'
            )
        }

        this.httpApi = new HttpApi(this, 'AppApiHttpGateway', {
            apiName: `${ResourceNames.apiName('app-api-http', this.stage)}-gateway`,
            description: 'HTTP API for the OIDC migration',
            // Create the default stage explicitly to configure its access logs.
            createDefaultStage: false,
            corsPreflight: {
                allowOrigins: [
                    Fn.importValue(
                        `${ResourceNames.stackName('frontend-infra', this.stage)}-ApplicationUrl`
                    ),
                    ...additionalOrigins,
                ],
                allowCredentials: true,
                allowMethods: [
                    CorsHttpMethod.GET,
                    CorsHttpMethod.POST,
                    CorsHttpMethod.PUT,
                    CorsHttpMethod.DELETE,
                    CorsHttpMethod.OPTIONS,
                ],
                allowHeaders: [
                    'content-type',
                    'authorization',
                    'x-amzn-trace-id',
                    'x-amzn-requestid',
                    'x-amz-date',
                    'x-api-key',
                    'x-amz-security-token',
                    'traceparent',
                    'tracestate',
                    'x-acting-as-user',
                ],
            },
        })

        const appApiStackName = ResourceNames.stackName('app-api', this.stage)
        const importFunction = (id: string, output: string) =>
            Function.fromFunctionAttributes(this, id, {
                functionArn: this.formatArn({
                    service: 'lambda',
                    resource: 'function',
                    resourceName: Fn.importValue(
                        `${appApiStackName}-${output}`
                    ),
                    arnFormat: ArnFormat.COLON_RESOURCE_NAME,
                }),
                sameEnvironment: true,
            })
        const graphqlFunction = importFunction(
            'GraphqlFunction',
            'GraphqlFunctionName'
        )
        const healthFunction = importFunction(
            'HealthFunction',
            'HealthFunctionName'
        )
        const oauthFunction = importFunction(
            'OauthFunction',
            'OauthTokenFunctionName'
        )
        const otelFunction = importFunction('OtelFunction', 'OtelFunctionName')
        const externalAuthorizerFunction = importFunction(
            'ExternalAuthorizerFunction',
            'ThirdPartyApiAuthorizerFunctionName'
        )

        // Payload 1.0 retains the REST-shaped events used by every existing
        // handler, including Apollo's request handler and OAuth form parsing.
        const graphqlIntegration = new HttpLambdaIntegration(
            'GraphqlIntegration',
            graphqlFunction,
            { payloadFormatVersion: PayloadFormatVersion.VERSION_1_0 }
        )
        const oktaStackName = ResourceNames.stackName('okta', this.stage)
        const jwtAuthorizer = new HttpJwtAuthorizer(
            'OktaJwtAuthorizer',
            Fn.importValue(`${oktaStackName}-Issuer`),
            { jwtAudience: [Fn.importValue(`${oktaStackName}-Audience`)] }
        )
        this.httpApi.addRoutes({
            path: '/graphql',
            methods: [HttpMethod.GET, HttpMethod.POST],
            integration: graphqlIntegration,
            authorizer: jwtAuthorizer,
        })

        // External clients use MC-Review-issued tokens. IAM responses use
        // authorizer payload 1.0, including authorizationToken and methodArn.
        const externalAuthorizer = new HttpLambdaAuthorizer(
            'ExternalAuthorizer',
            externalAuthorizerFunction,
            {
                responseTypes: [HttpLambdaResponseType.IAM],
                identitySource: ['$request.header.Authorization'],
                // Existing policies allow one method ARN; do not cache across
                // GET/POST or changes to external client permissions.
                resultsCacheTtl: Duration.seconds(0),
            }
        )
        this.httpApi.addRoutes({
            path: '/v1/graphql/external',
            methods: [HttpMethod.GET, HttpMethod.POST],
            integration: graphqlIntegration,
            authorizer: externalAuthorizer,
        })

        for (const route of [
            {
                path: '/health_check',
                method: HttpMethod.GET,
                handler: healthFunction,
            },
            {
                path: '/oauth/token',
                method: HttpMethod.POST,
                handler: oauthFunction,
            },
            { path: '/otel', method: HttpMethod.POST, handler: otelFunction },
        ]) {
            this.httpApi.addRoutes({
                path: route.path,
                methods: [route.method],
                integration: new HttpLambdaIntegration(
                    `${route.path}Integration`,
                    route.handler,
                    { payloadFormatVersion: PayloadFormatVersion.VERSION_1_0 }
                ),
            })
        }

        let apiGatewayLogGroup: LogGroup | undefined
        if (!isReviewEnvironment(this.stage)) {
            apiGatewayLogGroup = new LogGroup(this, 'ApiGatewayLogGroup', {
                logGroupName: `/aws/apigateway/${ResourceNames.apiName('app-api-http', this.stage)}-gateway`,
                retention: this.stageConfig.monitoring.logRetentionDays,
            })
        }

        const defaultStage = this.httpApi.addStage('DefaultStage', {
            stageName: '$default',
            autoDeploy: true,
            accessLogSettings: apiGatewayLogGroup
                ? {
                      destination: new LogGroupLogDestination(
                          apiGatewayLogGroup
                      ),
                      format: AccessLogFormat.custom(
                          JSON.stringify({
                              requestId: '$context.requestId',
                              requestTime: '$context.requestTime',
                              httpMethod: '$context.httpMethod',
                              routeKey: '$context.routeKey',
                              protocol: '$context.protocol',
                              status: '$context.status',
                              responseLength: '$context.responseLength',
                              responseLatency: '$context.responseLatency',
                              integrationLatency: '$context.integrationLatency',
                          })
                      ),
                  }
                : undefined,
        })

        new CfnOutput(this, 'HttpApiId', {
            value: this.httpApi.apiId,
            exportName: this.exportName('HttpApiId'),
            description: 'ID of the parallel HTTP API',
        })

        new CfnOutput(this, 'HttpApiEndpoint', {
            value: this.httpApi.apiEndpoint,
            exportName: this.exportName('HttpApiEndpoint'),
            description: 'Direct endpoint of the parallel HTTP API',
        })

        new CfnOutput(this, 'HttpApiStageName', {
            value: defaultStage.stageName,
            exportName: this.exportName('HttpApiStageName'),
            description: 'Default stage of the parallel HTTP API',
        })
    }
}
