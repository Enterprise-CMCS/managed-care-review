import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
// import { NagSuppressions } from 'cdk-nag';

export interface ApiEndpointProps {
  resource: apigateway.Resource;
  method: string;
  handler: lambda.IFunction;
  requestValidator?: apigateway.IRequestValidator;
  requestModels?: { [contentType: string]: apigateway.IModel };
  requestParameters?: { [key: string]: boolean };
  authorizationType?: apigateway.AuthorizationType;
  authorizer?: apigateway.IAuthorizer;
  apiKeyRequired?: boolean;
  requestTemplates?: { [contentType: string]: string };
  integrationResponses?: apigateway.IntegrationResponse[];
  methodResponses?: apigateway.MethodResponse[];
  contentHandling?: apigateway.ContentHandling;
}

/**
 * API endpoint with Lambda integration
 */
export class ApiEndpoint extends Construct {
  public readonly method: apigateway.Method;
  public readonly integration: apigateway.LambdaIntegration;
  private readonly authorizationType: apigateway.AuthorizationType;

  constructor(scope: Construct, id: string, props: ApiEndpointProps) {
    super(scope, id);

    // Store authorization type
    this.authorizationType = props.authorizationType || apigateway.AuthorizationType.NONE;

    // Create Lambda integration
    this.integration = new apigateway.LambdaIntegration(props.handler, {
      proxy: true,
      contentHandling: props.contentHandling,
      integrationResponses: props.integrationResponses || [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'"
          }
        },
        {
          statusCode: '400',
          selectionPattern: '.*"statusCode":400.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'"
          }
        },
        {
          statusCode: '500',
          selectionPattern: '.*"statusCode":500.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'"
          }
        }
      ],
      requestTemplates: props.requestTemplates
    });

    // Add method to resource
    this.method = props.resource.addMethod(props.method, this.integration, {
      authorizationType: props.authorizationType || apigateway.AuthorizationType.NONE,
      authorizer: props.authorizer,
      apiKeyRequired: props.apiKeyRequired || false,
      requestValidator: props.requestValidator,
      requestModels: props.requestModels,
      requestParameters: props.requestParameters,
      methodResponses: props.methodResponses || [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        },
        {
          statusCode: '400',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        },
        {
          statusCode: '500',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        }
      ]
    });

    // Apply CDK Nag suppressions
    // this.applyCdkNagSuppressions();
  }

  /**
   * Apply CDK Nag suppressions
   */
  private applyCdkNagSuppressions(): void {
    // CDK Nag suppressions temporarily disabled
  }
}

/**
 * Factory for creating common API endpoint patterns
 */
export class ApiEndpointFactory {
  /**
   * Create a public endpoint (no auth)
   */
  static createPublicEndpoint(
    scope: Construct,
    id: string,
    props: Omit<ApiEndpointProps, 'authorizationType'>
  ): ApiEndpoint {
    return new ApiEndpoint(scope, id, {
      ...props,
      authorizationType: apigateway.AuthorizationType.NONE
    });
  }

  /**
   * Create an authenticated endpoint (Cognito)
   */
  static createAuthenticatedEndpoint(
    scope: Construct,
    id: string,
    props: ApiEndpointProps & { userPool: cognito.IUserPool }
  ): ApiEndpoint {
    // Create Cognito authorizer if not provided
    const authorizer = props.authorizer || new apigateway.CognitoUserPoolsAuthorizer(
      scope,
      `${id}Authorizer`,
      {
        cognitoUserPools: [props.userPool],
        authorizerName: `${id}-authorizer`
      }
    );

    return new ApiEndpoint(scope, id, {
      ...props,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer
    });
  }

  /**
   * Create an API key protected endpoint
   */
  static createApiKeyEndpoint(
    scope: Construct,
    id: string,
    props: Omit<ApiEndpointProps, 'apiKeyRequired'>
  ): ApiEndpoint {
    return new ApiEndpoint(scope, id, {
      ...props,
      apiKeyRequired: true
    });
  }

  /**
   * Create an AWS IAM authenticated endpoint
   */
  static createIAMAuthEndpoint(
    scope: Construct,
    id: string,
    props: Omit<ApiEndpointProps, 'authorizationType'>
  ): ApiEndpoint {
    return new ApiEndpoint(scope, id, {
      ...props,
      authorizationType: apigateway.AuthorizationType.IAM
    });
  }

  /**
   * Create a binary content endpoint (for file uploads/downloads)
   * Use this when the Lambda returns binary content like ZIP, PDF, images, etc.
   * This prevents base64 encoding overhead and potential corruption
   */
  static createBinaryEndpoint(
    scope: Construct,
    id: string,
    props: ApiEndpointProps
  ): ApiEndpoint {
    return new ApiEndpoint(scope, id, {
      ...props,
      contentHandling: apigateway.ContentHandling.CONVERT_TO_BINARY
    });
  }

  /**
   * Create an authenticated binary endpoint (Cognito + binary content)
   * Use this for protected endpoints that handle binary data (e.g., authenticated file downloads)
   * Combines Cognito authentication with binary content handling
   */
  static createAuthenticatedBinaryEndpoint(
    scope: Construct,
    id: string,
    props: ApiEndpointProps & { userPool: cognito.IUserPool }
  ): ApiEndpoint {
    // Create Cognito authorizer if not provided
    const authorizer = props.authorizer || new apigateway.CognitoUserPoolsAuthorizer(
      scope,
      `${id}Authorizer`,
      {
        cognitoUserPools: [props.userPool],
        authorizerName: `${id}-authorizer`
      }
    );

    return new ApiEndpoint(scope, id, {
      ...props,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
      contentHandling: apigateway.ContentHandling.CONVERT_TO_BINARY
    });
  }

  /**
   * Create a GraphQL endpoint
   */
  static createGraphQLEndpoint(
    scope: Construct,
    id: string,
    props: {
      resource: apigateway.Resource;
      handler: lambda.IFunction;
      authType?: 'IAM' | 'COGNITO' | 'NONE';
      userPool?: cognito.IUserPool;
      methods?: ('GET' | 'POST')[];
    }
  ): ApiEndpoint[] {
    const methods = props.methods || ['POST'];
    const authType = props.authType || 'NONE';
    
    const requestModel = new apigateway.Model(scope, `${id}Model`, {
      restApi: props.resource.api,
      contentType: 'application/json',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          query: { type: apigateway.JsonSchemaType.STRING },
          variables: { type: apigateway.JsonSchemaType.OBJECT },
          operationName: { type: apigateway.JsonSchemaType.STRING }
        },
        required: ['query']
      }
    });
    
    return methods.map(method => {
      const endpointId = `${id}${method}`;
      
      switch (authType) {
        case 'IAM':
          return ApiEndpointFactory.createIAMAuthEndpoint(scope, endpointId, {
            resource: props.resource,
            method,
            handler: props.handler,
            requestModels: method === 'POST' ? { 'application/json': requestModel } : undefined
          });
        case 'COGNITO':
          if (!props.userPool) throw new Error('userPool required for COGNITO auth');
          return ApiEndpointFactory.createAuthenticatedEndpoint(scope, endpointId, {
            resource: props.resource,
            method,
            handler: props.handler,
            userPool: props.userPool,
            requestModels: method === 'POST' ? { 'application/json': requestModel } : undefined
          });
        default:
          return ApiEndpointFactory.createPublicEndpoint(scope, endpointId, {
            resource: props.resource,
            method,
            handler: props.handler,
            requestModels: method === 'POST' ? { 'application/json': requestModel } : undefined
          });
      }
    });
  }
}
