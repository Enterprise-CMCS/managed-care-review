import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { WafwebaclToApiGateway } from '@aws-solutions-constructs/aws-wafwebacl-apigateway';
import { Duration } from 'aws-cdk-lib';
import { SecurityConfig } from '@config/stage-config';
import { ResourceNames, API_PATHS } from '@config/constants';
import { ServiceRegistry } from '@constructs/base';
// import { NagSuppressions } from 'cdk-nag';

export interface WafProtectedApiProps {
  apiName: string;
  stage: string;
  securityConfig: SecurityConfig;
  description?: string;
  minimumCompressionSize?: number;
  binaryMediaTypes?: string[];
}

/**
 * API Gateway REST API with WAF protection using AWS Solutions Construct
 */
export class WafProtectedApi extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly webAcl: waf.CfnWebACL;
  public readonly logGroup: logs.LogGroup;
  public readonly deployment: apigateway.Deployment;

  constructor(scope: Construct, id: string, props: WafProtectedApiProps) {
    super(scope, id);

    // Create log group for API Gateway
    this.logGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/apigateway/${ResourceNames.resourceName(props.apiName, 'api', props.stage)}`,
      retention: logs.RetentionDays.ONE_MONTH
    });

    // Create the API Gateway REST API first
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: ResourceNames.resourceName(props.apiName, 'api', props.stage),
      description: props.description || `${props.apiName} API for ${props.stage}`,
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true,
        dataTraceEnabled: props.stage !== 'prod',
        loggingLevel: props.stage === 'prod' 
          ? apigateway.MethodLoggingLevel.ERROR 
          : apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
        methodOptions: {
          '/*/*': {  // Apply throttling to all resources and methods
            throttlingRateLimit: props.securityConfig.apiThrottleRate,
            throttlingBurstLimit: props.securityConfig.apiThrottleBurst
          }
        },
        accessLogDestination: new apigateway.LogGroupLogDestination(this.logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields()
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent'
        ],
        allowCredentials: true,
        maxAge: Duration.hours(1)
      },
      binaryMediaTypes: props.binaryMediaTypes,
      minimumCompressionSize: props.minimumCompressionSize || 1024,
      endpointTypes: [apigateway.EndpointType.REGIONAL]
    });

    // Attach WAF to the existing API Gateway if WAF is enabled
    if (props.securityConfig.wafEnabled) {
      const wafApiConstruct = new WafwebaclToApiGateway(this, 'WafApi', {
        existingApiGatewayInterface: this.api,
        webaclProps: {
          scope: 'REGIONAL',
          defaultAction: { allow: {} },
          rules: this.getWafRules(props.stage, props.securityConfig),
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${props.apiName}-${props.stage}-waf`
          }
        }
      });
      
      this.webAcl = wafApiConstruct.webacl;
    }

    this.deployment = this.api.latestDeployment!;

    // Add request validators
    this.addRequestValidators();

    // Add gateway responses
    this.addGatewayResponses();

    // Add usage plan
    this.addUsagePlan(props);

    // Store API information in Parameter Store
    ServiceRegistry.putApiId(this, props.stage, this.api.restApiId);
    ServiceRegistry.putApiUrl(this, props.stage, this.api.url);

    // Apply CDK Nag suppressions
    this.applyCdkNagSuppressions();
  }

  /**
   * Get WAF rules based on stage and configuration
   */
  private getWafRules(stage: string, securityConfig: SecurityConfig): any[] {
    const rules: any[] = [
      // AWS Managed Core Rule Set
      {
        name: 'AWSManagedRulesCommonRuleSet',
        priority: 1,
        overrideAction: { none: {} },
        statement: {
          managedRuleGroupStatement: {
            vendorName: 'AWS',
            name: 'AWSManagedRulesCommonRuleSet',
            excludedRules: stage === 'dev' ? [
              { name: 'SizeRestrictions_BODY' },
              { name: 'GenericRFI_BODY' }
            ] : []
          }
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'CommonRuleSetMetric'
        }
      },
      // Known Bad Inputs
      {
        name: 'AWSManagedRulesKnownBadInputsRuleSet',
        priority: 2,
        overrideAction: { none: {} },
        statement: {
          managedRuleGroupStatement: {
            vendorName: 'AWS',
            name: 'AWSManagedRulesKnownBadInputsRuleSet'
          }
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'KnownBadInputsMetric'
        }
      }
    ];

    // Add SQL injection protection for non-dev
    if (stage !== 'dev') {
      rules.push({
        name: 'AWSManagedRulesSQLiRuleSet',
        priority: 3,
        overrideAction: { none: {} },
        statement: {
          managedRuleGroupStatement: {
            vendorName: 'AWS',
            name: 'AWSManagedRulesSQLiRuleSet'
          }
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'SQLiRuleSetMetric'
        }
      });
    }

    // Add rate limiting for production
    if (stage === 'prod') {
      rules.push({
        name: 'RateLimitRule',
        priority: 4,
        action: { block: {} },
        statement: {
          rateBasedStatement: {
            limit: 2000,
            aggregateKeyType: 'IP'
          }
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'RateLimitMetric'
        }
      });
    }

    return rules;
  }

  /**
   * Add request validators to the API
   */
  private addRequestValidators(): void {
    // Body validator
    new apigateway.RequestValidator(this, 'BodyValidator', {
      restApi: this.api,
      requestValidatorName: 'validate-body',
      validateRequestBody: true,
      validateRequestParameters: false
    });

    // Parameters validator
    new apigateway.RequestValidator(this, 'ParamsValidator', {
      restApi: this.api,
      requestValidatorName: 'validate-params',
      validateRequestBody: false,
      validateRequestParameters: true
    });

    // Both validator
    new apigateway.RequestValidator(this, 'BodyAndParamsValidator', {
      restApi: this.api,
      requestValidatorName: 'validate-body-and-params',
      validateRequestBody: true,
      validateRequestParameters: true
    });
  }

  /**
   * Add gateway responses for better error handling
   */
  private addGatewayResponses(): void {
    // 4XX responses
    this.api.addGatewayResponse('BadRequestResponse', {
      type: apigateway.ResponseType.BAD_REQUEST_BODY,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'"
      },
      templates: {
        'application/json': '{"error": "Bad Request", "message": "$context.error.validationErrorString"}'
      }
    });

    // 5XX responses
    this.api.addGatewayResponse('InternalServerError', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'"
      },
      templates: {
        'application/json': '{"error": "Internal Server Error", "requestId": "$context.requestId"}'
      }
    });

    // Throttle response
    this.api.addGatewayResponse('ThrottleResponse', {
      type: apigateway.ResponseType.THROTTLED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'"
      },
      templates: {
        'application/json': '{"error": "Too Many Requests", "message": "Rate limit exceeded"}'
      }
    });
  }

  /**
   * Add usage plan with API keys
   */
  private addUsagePlan(props: WafProtectedApiProps): apigateway.UsagePlan {
    const plan = this.api.addUsagePlan('UsagePlan', {
      name: `${props.apiName}-${props.stage}-plan`,
      description: `Usage plan for ${props.apiName} API`,
      throttle: {
        rateLimit: props.securityConfig.apiThrottleRate,
        burstLimit: props.securityConfig.apiThrottleBurst
      },
      quota: props.stage === 'prod' ? {
        limit: 1000000,
        period: apigateway.Period.DAY
      } : undefined
    });

    // Add API stage to usage plan
    plan.addApiStage({
      api: this.api,
      stage: this.api.deploymentStage
    });

    // Create API key
    const apiKey = new apigateway.ApiKey(this, 'ApiKey', {
      apiKeyName: `${props.apiName}-${props.stage}-key`,
      description: `API key for ${props.apiName} API`
    });

    plan.addApiKey(apiKey);

    return plan;
  }

  /**
   * Apply CDK Nag suppressions
   */
  private applyCdkNagSuppressions(): void {
    // CDK Nag suppressions temporarily disabled
  }

  /**
   * Add a resource to the API
   */
  public addResource(path: string): apigateway.Resource {
    return this.api.root.addResource(path);
  }

  /**
   * Get the API URL
   */
  public get url(): string {
    return this.api.url;
  }

  /**
   * Get the API ID
   */
  public get restApiId(): string {
    return this.api.restApiId;
  }
}
