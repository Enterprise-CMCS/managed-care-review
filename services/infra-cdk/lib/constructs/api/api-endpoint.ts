import { Construct } from 'constructs'
import {
    AuthorizationType,
    CognitoUserPoolsAuthorizer,
    ContentHandling,
    type IAuthorizer,
    type IModel,
    type IRequestValidator,
    type IntegrationResponse,
    JsonSchemaType,
    LambdaIntegration,
    type Method,
    type MethodResponse,
    Model,
    type Resource,
} from 'aws-cdk-lib/aws-apigateway'
import type { IFunction } from 'aws-cdk-lib/aws-lambda'
import type { IUserPool } from 'aws-cdk-lib/aws-cognito'
// import { NagSuppressions } from 'cdk-nag';

export interface ApiEndpointProps {
    resource: Resource
    method: string
    handler: IFunction
    requestValidator?: IRequestValidator
    requestModels?: { [contentType: string]: IModel }
    requestParameters?: { [key: string]: boolean }
    authorizationType?: AuthorizationType
    authorizer?: IAuthorizer
    apiKeyRequired?: boolean
    requestTemplates?: { [contentType: string]: string }
    integrationResponses?: IntegrationResponse[]
    methodResponses?: MethodResponse[]
    contentHandling?: ContentHandling
}

/**
 * API endpoint with Lambda integration
 */
export class ApiEndpoint extends Construct {
    public readonly method: Method
    public readonly integration: LambdaIntegration
    private readonly authorizationType: AuthorizationType

    constructor(scope: Construct, id: string, props: ApiEndpointProps) {
        super(scope, id)

        // Store authorization type
        this.authorizationType =
            props.authorizationType || AuthorizationType.NONE

        // Create Lambda integration
        this.integration = new LambdaIntegration(props.handler, {
            proxy: true,
            contentHandling: props.contentHandling,
            integrationResponses: props.integrationResponses || [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin':
                            "'*'",
                    },
                },
                {
                    statusCode: '400',
                    selectionPattern: '.*"statusCode":400.*',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin':
                            "'*'",
                    },
                },
                {
                    statusCode: '500',
                    selectionPattern: '.*"statusCode":500.*',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin':
                            "'*'",
                    },
                },
            ],
            requestTemplates: props.requestTemplates,
        })

        // Add method to resource
        this.method = props.resource.addMethod(props.method, this.integration, {
            authorizationType:
                props.authorizationType || AuthorizationType.NONE,
            authorizer: props.authorizer,
            apiKeyRequired: props.apiKeyRequired || false,
            requestValidator: props.requestValidator,
            requestModels: props.requestModels,
            requestParameters: props.requestParameters,
            methodResponses: props.methodResponses || [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin':
                            true,
                        'method.response.header.Access-Control-Allow-Headers':
                            true,
                        'method.response.header.Access-Control-Allow-Methods':
                            true,
                    },
                },
                {
                    statusCode: '400',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin':
                            true,
                    },
                },
                {
                    statusCode: '500',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin':
                            true,
                    },
                },
            ],
        })

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
            authorizationType: AuthorizationType.NONE,
        })
    }

    /**
     * Create an authenticated endpoint (Cognito)
     */
    static createAuthenticatedEndpoint(
        scope: Construct,
        id: string,
        props: ApiEndpointProps & { userPool: IUserPool }
    ): ApiEndpoint {
        // Create Cognito authorizer if not provided
        const authorizer =
            props.authorizer ||
            new CognitoUserPoolsAuthorizer(scope, `${id}Authorizer`, {
                cognitoUserPools: [props.userPool],
                authorizerName: `${id}-authorizer`,
            })

        return new ApiEndpoint(scope, id, {
            ...props,
            authorizationType: AuthorizationType.COGNITO,
            authorizer,
        })
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
            apiKeyRequired: true,
        })
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
            authorizationType: AuthorizationType.IAM,
        })
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
            contentHandling: ContentHandling.CONVERT_TO_BINARY,
        })
    }

    /**
     * Create an authenticated binary endpoint (Cognito + binary content)
     * Use this for protected endpoints that handle binary data (e.g., authenticated file downloads)
     * Combines Cognito authentication with binary content handling
     */
    static createAuthenticatedBinaryEndpoint(
        scope: Construct,
        id: string,
        props: ApiEndpointProps & { userPool: IUserPool }
    ): ApiEndpoint {
        // Create Cognito authorizer if not provided
        const authorizer =
            props.authorizer ||
            new CognitoUserPoolsAuthorizer(scope, `${id}Authorizer`, {
                cognitoUserPools: [props.userPool],
                authorizerName: `${id}-authorizer`,
            })

        return new ApiEndpoint(scope, id, {
            ...props,
            authorizationType: AuthorizationType.COGNITO,
            authorizer,
            contentHandling: ContentHandling.CONVERT_TO_BINARY,
        })
    }

    /**
     * Create a GraphQL endpoint
     */
    static createGraphQLEndpoint(
        scope: Construct,
        id: string,
        props: {
            resource: Resource
            handler: IFunction
            authType?: 'IAM' | 'COGNITO' | 'NONE'
            userPool?: IUserPool
            methods?: ('GET' | 'POST')[]
        }
    ): ApiEndpoint[] {
        const methods = props.methods || ['POST']
        const authType = props.authType || 'NONE'

        const requestModel = new Model(scope, `${id}Model`, {
            restApi: props.resource.api,
            contentType: 'application/json',
            schema: {
                type: JsonSchemaType.OBJECT,
                properties: {
                    query: { type: JsonSchemaType.STRING },
                    variables: { type: JsonSchemaType.OBJECT },
                    operationName: { type: JsonSchemaType.STRING },
                },
                required: ['query'],
            },
        })

        return methods.map((method) => {
            const endpointId = `${id}${method}`

            switch (authType) {
                case 'IAM':
                    return ApiEndpointFactory.createIAMAuthEndpoint(
                        scope,
                        endpointId,
                        {
                            resource: props.resource,
                            method,
                            handler: props.handler,
                            requestModels:
                                method === 'POST'
                                    ? { 'application/json': requestModel }
                                    : undefined,
                        }
                    )
                case 'COGNITO':
                    if (!props.userPool)
                        throw new Error('userPool required for COGNITO auth')
                    return ApiEndpointFactory.createAuthenticatedEndpoint(
                        scope,
                        endpointId,
                        {
                            resource: props.resource,
                            method,
                            handler: props.handler,
                            userPool: props.userPool,
                            requestModels:
                                method === 'POST'
                                    ? { 'application/json': requestModel }
                                    : undefined,
                        }
                    )
                default:
                    return ApiEndpointFactory.createPublicEndpoint(
                        scope,
                        endpointId,
                        {
                            resource: props.resource,
                            method,
                            handler: props.handler,
                            requestModels:
                                method === 'POST'
                                    ? { 'application/json': requestModel }
                                    : undefined,
                        }
                    )
            }
        })
    }
}
