import { Duration } from 'aws-cdk-lib'
import {
    AuthorizationType,
    TokenAuthorizer,
    type Resource,
} from 'aws-cdk-lib/aws-apigateway'
import { Architecture, Runtime, type IFunction } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LogGroup, type RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'
import path from 'path'
import { ResourceNames } from '../../config/shared'
import { ApiEndpoint } from './api-endpoint'

export interface OidcGraphqlEndpointProps {
    graphqlResource: Resource
    graphqlHandler: IFunction
    stage: string
    logRetentionDays: RetentionDays
}

/**
 * Additive, deny-all OIDC route on the existing REST API.
 *
 * Keep this authorizer isolated from the application's role, VPC, configuration,
 * and secrets. Provider verification and user-context support are follow-up work.
 */
export class OidcGraphqlEndpoint extends Construct {
    constructor(scope: Construct, id: string, props: OidcGraphqlEndpointProps) {
        super(scope, id)

        const functionName = `${ResourceNames.apiName('app-api', props.stage)}-oidc-authorizer`
        const logGroup = new LogGroup(this, 'AuthorizerLogs', {
            logGroupName: `/aws/lambda/${functionName}`,
            retention: props.logRetentionDays,
        })
        const handler = new NodejsFunction(this, 'AuthorizerFunction', {
            functionName,
            runtime: Runtime.NODEJS_24_X,
            architecture: Architecture.X86_64,
            entry: path.join(
                __dirname,
                '../../../../app-api/src/handlers/oidc_authorizer.ts'
            ),
            handler: 'main',
            timeout: Duration.seconds(5),
            memorySize: 128,
            logGroup,
            bundling: { format: OutputFormat.ESM },
        })

        const authorizer = new TokenAuthorizer(this, 'Authorizer', {
            handler,
            authorizerName: functionName,
            identitySource: 'method.request.header.Authorization',
            resultsCacheTtl: Duration.seconds(0),
        })
        const resource = props.graphqlResource.addResource('oidc')

        for (const method of ['GET', 'POST']) {
            new ApiEndpoint(this, method, {
                resource,
                method,
                handler: props.graphqlHandler,
                authorizationType: AuthorizationType.CUSTOM,
                authorizer,
            })
        }
    }
}
