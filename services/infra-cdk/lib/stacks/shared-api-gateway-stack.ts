import { Stack, StackProps, CfnOutput, CfnResource } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { stackName } from '../config';
import { GraphqlApiConstruct } from '../constructs/api/graphql-api-construct';

export interface SharedApiGatewayStackProps extends StackProps {
  stage: string;
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  databaseSecretArn: string;
  databaseClusterEndpoint: string;
  databaseName: string;
  uploadsBucketName: string;
  qaBucketName: string;
  uploadsBucketArn: string;
  qaBucketArn: string;
  databaseClusterArn: string;
  applicationEndpoint?: string;
  healthFunction?: lambda.IFunction;
  oauthFunction?: lambda.IFunction;
  otelFunction?: lambda.IFunction;
}

/**
 * Shared API Gateway Stack - Single API for all endpoints (serverless parity)
 */
export class SharedApiGatewayStack extends Stack {
  public readonly api: apigateway.RestApi;
  private readonly stage: string;

  constructor(scope: Construct, id: string, props: SharedApiGatewayStackProps) {
    super(scope, id, {
      ...props,
      stackName: stackName('SharedApiGateway', props.stage),
      description: 'Shared API Gateway for Managed Care Review - All endpoints'
    });

    this.stage = props.stage;

    // Create shared API with CORS
    this.api = new apigateway.RestApi(this, 'AppApiGateway', {
      restApiName: `mcr-${props.stage}-api`,
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Amz-Security-Token']
      },
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true
      }
    });

    // Gateway responses with CORS
    ['DEFAULT_4XX', 'DEFAULT_5XX'].forEach(type => {
      new apigateway.CfnGatewayResponse(this, `GatewayResponse${type}`, {
        restApiId: this.api.restApiId,
        responseType: type,
        responseParameters: {
          'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
          'gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
        }
      });
    });

    // Add GraphQL endpoints via construct
    new GraphqlApiConstruct(this, 'GraphqlApi', {
      api: this.api,
      stage: props.stage,
      vpc: props.vpc,
      lambdaSecurityGroup: props.lambdaSecurityGroup,
      databaseSecretArn: props.databaseSecretArn,
      databaseClusterEndpoint: props.databaseClusterEndpoint,
      databaseName: props.databaseName,
      uploadsBucketName: props.uploadsBucketName,
      qaBucketName: props.qaBucketName,
      uploadsBucketArn: props.uploadsBucketArn,
      qaBucketArn: props.qaBucketArn,
      databaseClusterArn: props.databaseClusterArn,
      applicationEndpoint: props.applicationEndpoint,
      healthFunction: props.healthFunction,
      oauthFunction: props.oauthFunction,
      otelFunction: props.otelFunction
    });

    // WAF with exclusion
    const webAcl = this.createWebAcl();
    this.associateWaf(webAcl);

    // Outputs for GitHub Actions workflow (existing format)
    new CfnOutput(this, 'ApiGatewayRestApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID for GitHub Actions'
    });

    new CfnOutput(this, 'AppApiGatewayRootResourceId', {
      value: this.api.root.resourceId,
      description: 'API Gateway root resource ID'
    });

    // Outputs for app-web cf: lookups (serverless compatibility)
    new CfnOutput(this, 'ApiGatewayRestApiUrl', {
      value: this.api.url,
      exportName: `infra-api-${props.stage}-ApiGatewayRestApiUrl`,
      description: 'API Gateway URL for cf: lookups'
    });
  }

  private createWebAcl(): wafv2.CfnWebACL {
    return new wafv2.CfnWebACL(this, 'WebACL', {
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      rules: [
        {
          name: 'RateLimitRule',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: 'IP'
            }
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimit'
          }
        },
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              excludedRules: [
                { name: 'SizeRestrictions_BODY' }
              ]
            }
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRules'
          }
        }
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `WebACL-${this.stage}`
      }
    });
  }

  private associateWaf(webAcl: wafv2.CfnWebACL): void {
    const association = new wafv2.CfnWebACLAssociation(this, 'WafAssociation', {
      resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${this.api.restApiId}/stages/${this.api.deploymentStage.stageName}`,
      webAclArn: webAcl.attrArn
    });
    
    association.addDependency(this.api.deploymentStage.node.defaultChild as CfnResource);
    association.addDependency(webAcl);
  }
}