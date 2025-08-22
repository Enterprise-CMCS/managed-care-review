import { Stack, StackProps, Duration, CfnOutput, CfnResource } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';
import { getBundlingConfig } from '../lambda-bundling';
import { 
  stackName,
  resourceName,
  getConfig,
  getLambdaEnvironment,
  getDatabaseUrl,
  SSM_PATHS,
  ResourceNames
} from '../config';

/**
 * Props for GraphQL API Stack - 100% Serverless Parity
 */
export interface GraphQLApiStackProps extends StackProps {
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
  // Public Lambda functions to integrate
  healthFunction?: lambda.IFunction;
  oauthFunction?: lambda.IFunction;
  otelFunction?: lambda.IFunction;
}

/**
 * GraphQL API Stack - Monolithic CDK with 100% Serverless Parity
 * 
 * Replicates exact serverless.yml functionality:
 * - Multiple authorization models (IAM + Custom)
 * - Custom authorizer function (third_party_API_authorizer)
 * - Multiple GraphQL endpoints (/graphql + /v1/graphql/external)
 * - WAF integration with rate limiting
 * - Production-ready security and monitoring
 */
export class GraphQLApiStack extends Stack {
  private readonly stage: string;
  public apiUrl: string;
  public apiId: string;
  
  // Dependencies injected via props
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

  constructor(scope: Construct, id: string, props: GraphQLApiStackProps) {
    super(scope, id, {
      ...props,
      stackName: stackName('GraphQLApi', props.stage),
      description: 'GraphQL API with 100% Serverless Parity - Monolithic CDK Stack'
    });

    this.stage = props.stage;

    // Store dependencies
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

    // Define resources using BaseStack abstract method
    this.defineResources();
  }

  /**
   * Define resources
   */
  private defineResources(): void {
    // Phase 2: Create GraphQL Lambda function
    const graphqlLambda = this.createGraphQLLambda();
    
    // Phase 3: Create custom authorizer
    const customAuthorizer = this.createCustomAuthorizer();
    
    // Phase 4: Create API Gateway and basic endpoints
    const api = this.createApiGateway();
    this.addGraphqlEndpoints(api, graphqlLambda);
    
    // Phase 5: Add external endpoints with custom authorization
    this.addExternalEndpoints(api, graphqlLambda, customAuthorizer);
    
    // Phase 5.5: Add public endpoints (health, oauth, otel) - matches serverless exactly
    this.addPublicEndpoints(api);
    
    // Phase 6: Add WAF protection
    const webAcl = this.createWebAcl();
    this.associateWaf(api, webAcl);
    
    // Phase 7: Create outputs
    this.createOutputs(api);
    
    // Store API URL for outputs
    this.apiUrl = api.url;
    this.apiId = api.restApiId;
    
    console.log('🎉 All phases complete: GraphQL Stack ready for deployment!');
  }

  // === PHASE 2: LAMBDA FUNCTIONS ===
  private createGraphQLLambda(): NodejsFunction {
    return new NodejsFunction(this, 'GraphQLFunction', {
      functionName: resourceName('graphql-api', 'graphql', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'apollo_gql.ts'),
      handler: 'gqlHandler',
      
      // Runtime configuration (matches serverless exactly)
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64, // Keep current until migration validated
      timeout: Duration.seconds(30), // Matches serverless GraphQL timeout exactly
      memorySize: this.getMemorySize(), // 4096 for prod, 1024 for default
      
      // Layers added by Lambda Monitoring Aspect (Prisma bundled directly)
      
      // VPC configuration (matches serverless exactly)
      vpc: this.vpc,
      securityGroups: [this.lambdaSecurityGroup],
      
      // Environment and bundling
      environment: this.getGraphQLEnvironment(),
      bundling: getBundlingConfig('apollo_gql', this.stage),
      
      // IAM role with all serverless permissions
      role: this.createGraphQLRole()
    });
  }

  private createCustomAuthorizer(): NodejsFunction {
    return new NodejsFunction(this, 'CustomAuthorizer', {
      functionName: resourceName('graphql-api', 'authorizer', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'third_party_API_authorizer.ts'),
      handler: 'main', // Matches serverless handler exactly
      
      // Runtime configuration (lighter than GraphQL function)
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: Duration.seconds(30), // Sufficient for authorization logic
      memorySize: 256, // Lightweight authorizer
      
      // Layers added by Lambda Monitoring Aspect
      
      // Minimal environment for authorizer
      environment: {
        stage: this.stage,
        REGION: this.region,
        DATABASE_ENGINE: 'postgres',
        JWT_SECRET: `{{resolve:secretsmanager:${ssm.StringParameter.valueForStringParameter(this, `/mcr-cdk/${this.stage}/foundation/jwt-secret-arn`)}:SecretString:jwtsigningkey}}`,
        NR_LICENSE_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.NR_LICENSE_KEY),
        DEPLOYMENT_TIMESTAMP: new Date().toISOString(),
        ...getLambdaEnvironment(this.stage)
      },
      
      // Use function-specific bundling
      bundling: getBundlingConfig('third_party_API_authorizer', this.stage),
      
      // Basic execution role (no database/S3 access needed)
      role: this.createAuthorizerRole()
    });
  }

  private createAuthorizerRole(): iam.Role {
    return new iam.Role(this, 'AuthorizerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        AuthorizerPolicy: new iam.PolicyDocument({
          statements: [
            // Basic Lambda execution permissions (replaces managed policy)
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

  // === PHASE 4: API GATEWAY ===
  private createApiGateway(): apigateway.RestApi {
    return new apigateway.RestApi(this, 'GraphQLApi', {
      restApiName: `mcr-${this.stage}-graphql-api`,
      description: `GraphQL API for Managed Care Review - ${this.stage}`,
      
      // CORS configuration (matches serverless exactly)
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'], // Matches serverless cors: true
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Amz-Security-Token'],
        allowCredentials: false
      },
      
      // Deploy options with observability (production ready)
      deployOptions: {
        stageName: this.stage,
        tracingEnabled: true, // Enable X-Ray tracing
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true
      },
      
      // API Gateway policy (if needed for production)
      policy: undefined // Let CDK handle default policy
    });
  }

  // === PHASE 5: ENDPOINTS ===
  private addGraphqlEndpoints(api: apigateway.RestApi, lambda: NodejsFunction): void {
    // Create Lambda integration (shared for both methods)
    const integration = new apigateway.LambdaIntegration(lambda, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      proxy: true // Enable proxy integration for GraphQL
    });
    
    // Create /graphql resource
    const graphqlResource = api.root.addResource('graphql');
    
    // POST /graphql (matches serverless events exactly)
    graphqlResource.addMethod('POST', integration, {
      authorizationType: apigateway.AuthorizationType.IAM, // matches serverless: aws_iam
      requestParameters: {
        'method.request.header.Authorization': true // Require auth header
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
    
    // GET /graphql (matches serverless events exactly)  
    graphqlResource.addMethod('GET', integration, {
      authorizationType: apigateway.AuthorizationType.IAM, // matches serverless: aws_iam
      requestParameters: {
        'method.request.header.Authorization': true // Require auth header
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

    // Create /zip resource for bulk download (zip_keys function)
    const zipResource = api.root.addResource('zip');
    
    // Import the zip_keys function from file-ops-stack
    // Using LambdaFunction to avoid conflict with 'lambda' parameter
    const zipKeysFunction = LambdaFunction.fromFunctionName(
      this,
      'ZipKeysFunction',
      resourceName('file-ops', 'zip-keys', this.stage)
    );
    
    // Create Lambda integration for zip_keys
    const zipIntegration = new apigateway.LambdaIntegration(zipKeysFunction, {
      proxy: true // Enable proxy integration
    });
    
    // POST /zip with AWS IAM authorization (matches serverless exactly)
    zipResource.addMethod('POST', zipIntegration, {
      authorizationType: apigateway.AuthorizationType.IAM,
      requestParameters: {
        'method.request.header.Authorization': true // Require auth header
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
    // Health Check endpoint - GET /health_check (matches serverless exactly)
    if (this.healthFunction) {
      const healthResource = api.root.addResource('health_check');
      const healthIntegration = new apigateway.LambdaIntegration(this.healthFunction, {
        proxy: true
      });
      healthResource.addMethod('GET', healthIntegration, {
        authorizationType: apigateway.AuthorizationType.NONE, // No auth required
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
    
    // OAuth Token endpoint - POST /oauth/token (matches serverless exactly)
    if (this.oauthFunction) {
      const oauthResource = api.root.addResource('oauth');
      const tokenResource = oauthResource.addResource('token');
      const oauthIntegration = new apigateway.LambdaIntegration(this.oauthFunction, {
        proxy: true
      });
      tokenResource.addMethod('POST', oauthIntegration, {
        authorizationType: apigateway.AuthorizationType.NONE, // No auth required
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
    
    // OTEL Proxy endpoint - POST /otel (matches serverless exactly)
    if (this.otelFunction) {
      const otelResource = api.root.addResource('otel');
      const otelIntegration = new apigateway.LambdaIntegration(this.otelFunction, {
        proxy: true
      });
      otelResource.addMethod('POST', otelIntegration, {
        authorizationType: apigateway.AuthorizationType.NONE, // No auth required
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
    // Create Lambda integration (same as internal endpoints)
    const integration = new apigateway.LambdaIntegration(lambda, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      proxy: true // Enable proxy integration for GraphQL
    });
    
    // Create custom authorizer (matches serverless configuration exactly)
    const customAuth = new apigateway.TokenAuthorizer(this, 'CustomAuth', {
      handler: authorizer,
      identitySource: 'method.request.header.Authorization', // Matches serverless identitySource
      resultsCacheTtl: Duration.minutes(5), // Performance optimization
      authorizerName: 'ThirdPartyApiAuthorizer' // Match serverless name
    });
    
    // Create path structure: /v1/graphql/external (matches serverless exactly)
    const v1Resource = api.root.addResource('v1');
    const v1GraphqlResource = v1Resource.addResource('graphql');
    const externalResource = v1GraphqlResource.addResource('external');
    
    // POST /v1/graphql/external (matches serverless events exactly)
    externalResource.addMethod('POST', integration, {
      authorizer: customAuth, // Use custom authorizer (not IAM)
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    });
    
    // GET /v1/graphql/external (matches serverless events exactly)
    externalResource.addMethod('GET', integration, {
      authorizer: customAuth, // Use custom authorizer (not IAM)
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

  // === PHASE 6: SECURITY ===
  private createWebAcl(): wafv2.CfnWebACL {
    return new wafv2.CfnWebACL(this, 'GraphQLWebACL', {
      scope: 'REGIONAL', // Required for API Gateway
      defaultAction: { allow: {} }, // Allow by default, block specific threats
      
      // Production-ready security rules
      rules: [
        {
          name: 'RateLimitRule',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: 2000, // 2000 requests per 5 minutes per IP
              aggregateKeyType: 'IP'
            }
          },
          action: { block: {} }, // Block excessive requests
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'GraphQLRateLimit'
          }
        },
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet'
            }
          },
          overrideAction: { none: {} }, // Don't override managed rule group actions
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'GraphQLCommonRules'
          }
        }
      ],
      
      // Global visibility configuration
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `GraphQLWebACL-${this.stage}`
      }
    });
  }

  private associateWaf(api: apigateway.RestApi, webAcl: wafv2.CfnWebACL): void {
    const association = new wafv2.CfnWebACLAssociation(this, 'GraphQLWafAssociation', {
      resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${api.restApiId}/stages/${api.deploymentStage.stageName}`,
      webAclArn: webAcl.attrArn
    });
    
    // Ensure API Gateway deployment completes before WAF association
    association.addDependency(api.deploymentStage.node.defaultChild as CfnResource);
    association.addDependency(webAcl);
  }

  // === CONFIGURATION HELPERS ===
  private getGraphQLEnvironment(): Record<string, string> {
    return {
      // Base environment (matches serverless provider.environment)
      stage: this.stage,
      REGION: this.region,
      
      // Node.js optimization
      ...getLambdaEnvironment(this.stage),
      
      // Database configuration
      // Use AWS_SM to fetch from Secrets Manager at runtime with proper URL encoding
      DATABASE_URL: 'AWS_SM', // Tells the app to fetch from Secrets Manager
      DATABASE_ENGINE: 'postgres',
      SECRETS_MANAGER_SECRET: `mcr-cdk-aurora-postgres-${this.stage}`, // CDK-managed secret
      
      // Prisma configuration - bundled directly
      PRISMA_QUERY_ENGINE_LIBRARY: './node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
      
      // S3 buckets (exact serverless variable names)
      VITE_APP_S3_DOCUMENTS_BUCKET: this.uploadsBucketName,
      VITE_APP_S3_QA_BUCKET: this.qaBucketName,
      
      // Authentication & Authorization
      VITE_APP_AUTH_MODE: this.stage === 'dev' ? 'LOCAL' : 'AWS_COGNITO', // Matches serverless logic
      JWT_SECRET: '{{resolve:secretsmanager:' + ssm.StringParameter.valueForStringParameter(this, `/mcr-cdk/${this.stage}/foundation/jwt-secret-arn`) + ':SecretString:jwtsigningkey}}',
      
      // OpenTelemetry configuration (matches serverless exactly)
      API_APP_OTEL_COLLECTOR_URL: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
      NR_LICENSE_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.NR_LICENSE_KEY),
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
      OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
      DEPLOYMENT_TIMESTAMP: new Date().toISOString(),
      
      // Feature flags and external services
      LD_SDK_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.LD_SDK_KEY),
      EMAILER_MODE: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.EMAILER_MODE),
      PARAMETER_STORE_MODE: 'AWS',
      
      // Application configuration
      APPLICATION_ENDPOINT: this.applicationEndpoint || `https://mcr-${this.stage}.cms.gov`
    };
  }

  private createGraphQLRole(): iam.Role {
    return new iam.Role(this, 'GraphQLRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        GraphQLPolicy: new iam.PolicyDocument({
          statements: [
            // Basic Lambda execution permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
              ],
              resources: ['*']
            }),
            // VPC permissions (matches serverless pattern)
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
            // Cognito user lookup (matches serverless exactly)
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['cognito-idp:ListUsers'],
              resources: ['*']
            }),
            // Secrets Manager access (matches serverless exactly)
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret'
              ],
              resources: ['*']
            }),
            // RDS database connection (matches serverless exactly)
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['rds-db:connect'],
              resources: [this.databaseClusterArn]
            }),
            // SES email sending (matches serverless exactly)
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ses:SendEmail', 'ses:SendRawEmail'],
              resources: ['*']
            }),
            // Lambda invocation (matches serverless exactly)
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: ['*']
            }),
            // S3 bucket access (matches serverless paths exactly)
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:*'],
              resources: [
                `${this.uploadsBucketArn}/allusers/*`,
                `${this.qaBucketArn}/allusers/*`,
                `${this.uploadsBucketArn}/zips/*`
              ]
            }),
            // S3 bucket listing (matches serverless exactly)
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListBucket', 's3:GetBucketLocation'],
              resources: [this.uploadsBucketArn, this.qaBucketArn]
            }),
            // SSM parameter access (matches serverless exactly)
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ssm:GetParameter', 'ssm:GetParameters'],
              resources: ['*']
            }),
            // RDS snapshot operations (matches serverless exactly)
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

  private getMemorySize(): number {
    return this.stage === 'prod' ? 4096 : 1024; // Match serverless exactly
  }

  // === PHASE 7: OUTPUTS ===
  private createOutputs(api: apigateway.RestApi): void {
    new CfnOutput(this, 'GraphQLApiUrl', {
      value: api.url,
      description: 'GraphQL API Gateway URL',
      exportName: `${this.stackName}-GraphQLApiUrl`
    });

    new CfnOutput(this, 'GraphQLApiId', {
      value: api.restApiId,
      description: 'GraphQL API Gateway ID',
      exportName: `${this.stackName}-GraphQLApiId`
    });

    new CfnOutput(this, 'GraphQLFunctionName', {
      value: resourceName('graphql-api', 'graphql', this.stage),
      description: 'GraphQL Lambda Function Name',
      exportName: `${this.stackName}-GraphQLFunctionName`
    });

    new CfnOutput(this, 'CustomAuthorizerName', {
      value: resourceName('graphql-api', 'authorizer', this.stage),
      description: 'Custom Authorizer Lambda Function Name',
      exportName: `${this.stackName}-CustomAuthorizerName`
    });
  }
}
