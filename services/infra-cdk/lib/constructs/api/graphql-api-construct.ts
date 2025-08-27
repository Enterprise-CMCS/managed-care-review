import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';
import { getBundlingConfig } from '../../lambda-bundling';
import { OtelLambda } from '../otel-lambda';
import { 
  resourceName,
  getLambdaEnvironment,
  SSM_PATHS
} from '../../config';

export interface GraphqlApiConstructProps {
  api: apigateway.RestApi;
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
 * GraphQL API Construct - Adds GraphQL endpoints to shared API Gateway
 */
export class GraphqlApiConstruct extends Construct {
  private readonly stage: string;
  private readonly vpc: ec2.IVpc;
  private readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  private readonly databaseSecretArn: string;
  private readonly databaseClusterEndpoint: string;
  private readonly databaseName: string;
  private readonly uploadsBucketName: string;
  private readonly qaBucketName: string;
  private readonly uploadsBucketArn: string;
  private readonly qaBucketArn: string;
  private readonly databaseClusterArn: string;
  private readonly applicationEndpoint?: string;
  private readonly healthFunction?: lambda.IFunction;
  private readonly oauthFunction?: lambda.IFunction;
  private readonly otelFunction?: lambda.IFunction;

  constructor(scope: Construct, id: string, props: GraphqlApiConstructProps) {
    super(scope, id);

    // Store props
    this.stage = props.stage;
    this.vpc = props.vpc;
    this.lambdaSecurityGroup = props.lambdaSecurityGroup;
    this.databaseSecretArn = props.databaseSecretArn;
    this.databaseClusterEndpoint = props.databaseClusterEndpoint;
    this.databaseName = props.databaseName;
    this.uploadsBucketName = props.uploadsBucketName;
    this.qaBucketName = props.qaBucketName;
    this.uploadsBucketArn = props.uploadsBucketArn;
    this.qaBucketArn = props.qaBucketArn;
    this.databaseClusterArn = props.databaseClusterArn;
    this.applicationEndpoint = props.applicationEndpoint;
    this.healthFunction = props.healthFunction;
    this.oauthFunction = props.oauthFunction;
    this.otelFunction = props.otelFunction;

    // Create Lambda functions
    const graphqlLambda = this.createGraphQLLambda();
    const customAuthorizer = this.createCustomAuthorizer();
    
    // Add endpoints to shared API
    this.addGraphqlEndpoints(props.api, graphqlLambda);
    this.addExternalEndpoints(props.api, graphqlLambda, customAuthorizer);
    this.addPublicEndpoints(props.api);
  }

  private createGraphQLLambda(): OtelLambda {
    return new OtelLambda(this, 'GraphQLFunction', {
      functionName: resourceName('graphql-api', 'graphql', this.stage),
      entry: path.join(__dirname, '..', '..', '..', '..', 'app-api', 'src', 'handlers', 'apollo_gql.ts'),
      handler: 'gqlHandler',
      timeout: Duration.seconds(30),
      memorySize: this.getMemorySize(),
      vpc: this.vpc,
      securityGroups: [this.lambdaSecurityGroup],
      environment: this.getGraphQLEnvironment(),
      bundlingType: 'graphql',
      stage: this.stage,
      role: this.createGraphQLRole()
    });
  }

  private createCustomAuthorizer(): OtelLambda {
    return new OtelLambda(this, 'CustomAuthorizer', {
      functionName: resourceName('graphql-api', 'authorizer', this.stage),
      entry: path.join(__dirname, '..', '..', '..', '..', 'app-api', 'src', 'handlers', 'third_party_API_authorizer.ts'),
      handler: 'main',
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        stage: this.stage,
        REGION: 'us-east-1',
        DATABASE_ENGINE: 'postgres',
        JWT_SECRET: `{{resolve:secretsmanager:${ssm.StringParameter.valueForStringParameter(this, `/mcr-cdk/${this.stage}/foundation/jwt-secret-arn`)}:SecretString:jwtsigningkey}}`,
        NR_LICENSE_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.NR_LICENSE_KEY),
        DEPLOYMENT_TIMESTAMP: new Date().toISOString()
      },
      bundlingType: 'default',
      stage: this.stage,
      role: this.createAuthorizerRole()
    });
  }

  private addGraphqlEndpoints(api: apigateway.RestApi, lambda: NodejsFunction): void {
    const integration = new apigateway.LambdaIntegration(lambda, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      proxy: true
    });
    
    const graphqlResource = api.root.addResource('graphql');
    
    graphqlResource.addMethod('POST', integration, {
      authorizationType: apigateway.AuthorizationType.IAM,
      requestParameters: {
        'method.request.header.Authorization': true
      },
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    });
    
    graphqlResource.addMethod('GET', integration, {
      authorizationType: apigateway.AuthorizationType.IAM,
      requestParameters: {
        'method.request.header.Authorization': true
      },
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    });

    // Add /zip endpoint
    const zipResource = api.root.addResource('zip');
    const zipKeysFunction = LambdaFunction.fromFunctionName(
      this,
      'ZipKeysFunction',
      resourceName('file-ops', 'zip-keys', this.stage)
    );
    
    const zipIntegration = new apigateway.LambdaIntegration(zipKeysFunction, {
      proxy: true
    });
    
    zipResource.addMethod('POST', zipIntegration, {
      authorizationType: apigateway.AuthorizationType.IAM,
      requestParameters: {
        'method.request.header.Authorization': true
      },
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    });
  }

  private addPublicEndpoints(api: apigateway.RestApi): void {
    // Health Check endpoint
    if (this.healthFunction) {
      const healthResource = api.root.addResource('health_check');
      const healthIntegration = new apigateway.LambdaIntegration(this.healthFunction, {
        proxy: true
      });
      healthResource.addMethod('GET', healthIntegration, {
        authorizationType: apigateway.AuthorizationType.NONE,
        methodResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        }]
      });
    }
    
    // OAuth Token endpoint
    if (this.oauthFunction) {
      const oauthResource = api.root.addResource('oauth');
      const tokenResource = oauthResource.addResource('token');
      const oauthIntegration = new apigateway.LambdaIntegration(this.oauthFunction, {
        proxy: true
      });
      tokenResource.addMethod('POST', oauthIntegration, {
        authorizationType: apigateway.AuthorizationType.NONE,
        methodResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        }]
      });
    }
    
    // OTEL Proxy endpoint
    if (this.otelFunction) {
      const otelResource = api.root.addResource('otel');
      const otelIntegration = new apigateway.LambdaIntegration(this.otelFunction, {
        proxy: true
      });
      otelResource.addMethod('POST', otelIntegration, {
        authorizationType: apigateway.AuthorizationType.NONE,
        methodResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        }]
      });
    }
  }

  private addExternalEndpoints(
    api: apigateway.RestApi, 
    lambda: NodejsFunction, 
    authorizer: NodejsFunction
  ): void {
    const integration = new apigateway.LambdaIntegration(lambda, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      proxy: true
    });
    
    const customAuth = new apigateway.TokenAuthorizer(this, 'CustomAuth', {
      handler: authorizer,
      identitySource: 'method.request.header.Authorization',
      resultsCacheTtl: Duration.minutes(5),
      authorizerName: 'ThirdPartyApiAuthorizer'
    });
    
    const v1Resource = api.root.addResource('v1');
    const v1GraphqlResource = v1Resource.addResource('graphql');
    const externalResource = v1GraphqlResource.addResource('external');
    
    externalResource.addMethod('POST', integration, {
      authorizer: customAuth,
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    });
    
    externalResource.addMethod('GET', integration, {
      authorizer: customAuth,
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    });
  }

  private getGraphQLEnvironment(): Record<string, string> {
    return {
      stage: this.stage,
      REGION: 'us-east-1',
      ...getLambdaEnvironment(this.stage),
      DATABASE_URL: 'AWS_SM',
      DATABASE_ENGINE: 'postgres',
      SECRETS_MANAGER_SECRET: `mcr-cdk-aurora-postgres-${this.stage}`,
      PRISMA_QUERY_ENGINE_LIBRARY: './node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
      VITE_APP_S3_DOCUMENTS_BUCKET: this.uploadsBucketName,
      VITE_APP_S3_QA_BUCKET: this.qaBucketName,
      VITE_APP_AUTH_MODE: this.stage === 'dev' ? 'LOCAL' : 'AWS_COGNITO',
      JWT_SECRET: '{{resolve:secretsmanager:' + ssm.StringParameter.valueForStringParameter(this, `/mcr-cdk/${this.stage}/foundation/jwt-secret-arn`) + ':SecretString:jwtsigningkey}}',
      API_APP_OTEL_COLLECTOR_URL: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
      NR_LICENSE_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.NR_LICENSE_KEY),
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
      OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
      DEPLOYMENT_TIMESTAMP: new Date().toISOString(),
      LD_SDK_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.LD_SDK_KEY),
      EMAILER_MODE: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.EMAILER_MODE),
      PARAMETER_STORE_MODE: 'AWS',
      APPLICATION_ENDPOINT: this.applicationEndpoint || `https://mcr-${this.stage}.cms.gov`
    };
  }

  private createGraphQLRole(): iam.Role {
    return new iam.Role(this, 'GraphQLRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        GraphQLPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
              ],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ec2:CreateNetworkInterface',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
                'ec2:DescribeInstances',
                'ec2:AttachNetworkInterface'
              ],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['cognito-idp:ListUsers'],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret'
              ],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['rds-db:connect'],
              resources: [this.databaseClusterArn]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ses:SendEmail', 'ses:SendRawEmail'],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:*'],
              resources: [
                `${this.uploadsBucketArn}/allusers/*`,
                `${this.qaBucketArn}/allusers/*`,
                `${this.uploadsBucketArn}/zips/*`
              ]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListBucket', 's3:GetBucketLocation'],
              resources: [this.uploadsBucketArn, this.qaBucketArn]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ssm:GetParameter', 'ssm:GetParameters'],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'rds:CreateDBClusterSnapshot',
                'rds:CreateDBSnapshot',
                'rds:CopyDBClusterSnapshot',
                'rds:CopyDBSnapshot',
                'rds:DescribeDBClusterSnapshots',
                'rds:DeleteDBClusterSnapshot'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });
  }

  private createAuthorizerRole(): iam.Role {
    return new iam.Role(this, 'AuthorizerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        AuthorizerPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              resources: ['*']
            })
          ]
        })
      }
    });
  }

  private getMemorySize(): number {
    return this.stage === 'prod' ? 4096 : 1024;
  }
}