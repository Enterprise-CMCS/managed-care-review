import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { getBundlingConfig } from '../lambda-bundling';
import { getLambdaEnvironment, SSM_PATHS } from '../config';

/**
 * CDK-native Lambda function with OTEL instrumentation
 * Ensures collector.yml is ALWAYS bundled and OTEL is properly configured
 */
export interface OtelLambdaProps extends Omit<NodejsFunctionProps, 'bundling' | 'layers'> {
  stage: string;
  bundlingType?: 'default' | 'graphql' | 'email';
  additionalLayers?: lambda.ILayerVersion[];
}

export class OtelLambda extends NodejsFunction {
  constructor(scope: Construct, id: string, props: OtelLambdaProps) {
    const { stage, bundlingType = 'default', additionalLayers = [], environment = {}, ...restProps } = props;
    
    // Get OTEL layer from SSM
    const otelLayerArn = ssm.StringParameter.valueForStringParameter(
      scope,
      SSM_PATHS.OTEL_LAYER.replace('{stage}', stage)
    );
    const otelLayer = lambda.LayerVersion.fromLayerVersionArn(scope, `${id}OtelLayer`, otelLayerArn);
    
    // Merge OTEL environment with user environment
    const otelEnvironment = {
      ...getLambdaEnvironment(stage),
      API_APP_OTEL_COLLECTOR_URL: ssm.StringParameter.valueForStringParameter(
        scope, 
        SSM_PATHS.OTEL_COLLECTOR_URL
      ),
      NR_LICENSE_KEY: ssm.StringParameter.valueForStringParameter(
        scope,
        SSM_PATHS.NR_LICENSE_KEY
      ),
      ...environment
    };
    
    super(scope, id, {
      ...restProps,
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      // OTEL layer is ALWAYS included
      layers: [otelLayer, ...additionalLayers],
      // Bundling ALWAYS includes collector.yml
      bundling: getBundlingConfig(bundlingType === 'graphql' ? 'apollo_gql' : 'default', stage),
      environment: otelEnvironment
    });
  }
}

/**
 * Factory functions for common Lambda types
 */
export const createGraphQLLambda = (scope: Construct, id: string, props: OtelLambdaProps) => 
  new OtelLambda(scope, id, { ...props, bundlingType: 'graphql' });

export const createEmailLambda = (scope: Construct, id: string, props: OtelLambdaProps) => 
  new OtelLambda(scope, id, { ...props, bundlingType: 'email' });

export const createDatabaseLambda = (scope: Construct, id: string, props: OtelLambdaProps) => 
  new OtelLambda(scope, id, { ...props, bundlingType: 'default' });
