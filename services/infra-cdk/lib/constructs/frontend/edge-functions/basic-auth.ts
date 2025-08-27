import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { Duration, Stack } from 'aws-cdk-lib';

export interface BasicAuthEdgeFunctionProps {
  /**
   * Stage name
   */
  stage: string;
  
  /**
   * Basic auth username (from environment variable)
   */
  username?: string;
  
  /**
   * Basic auth password (from environment variable) 
   */
  password?: string;
  
  /**
   * Pass-through mode - disables authentication to match serverless
   */
  passThrough?: boolean;
}

/**
 * Lambda@Edge function for basic authentication
 * Matches serverless ui basicAuth configuration
 */
export class BasicAuthEdgeFunction extends Construct {
  public readonly function: cloudfront.experimental.EdgeFunction;
  
  constructor(scope: Construct, id: string, props: BasicAuthEdgeFunctionProps) {
    super(scope, id);
    
    // Get credentials from environment or use defaults
    const username = props.username || process.env.BASIC_AUTH_USER || 'onemacuser';
    const password = props.password || process.env.BASIC_AUTH_PASS || 'onemacpass';
    
    // Create Lambda@Edge function
    this.function = new cloudfront.experimental.EdgeFunction(this, 'Function', {
      // Let CDK auto-generate unique function name to avoid conflicts
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      timeout: Duration.seconds(5), // Lambda@Edge limit
      memorySize: 128, // Lambda@Edge limit
      code: lambda.Code.fromInline(props.passThrough ? `
'use strict';

exports.handler = (event, context, callback) => {
  // Pass-through mode - no authentication (matches serverless)
  const request = event.Records[0].cf.request;
  callback(null, request);
};
` : `
'use strict';

exports.handler = (event, context, callback) => {
  // Get request and headers
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  
  // Configure authentication
  const authUser = '${username}';
  const authPass = '${password}';
  
  // Construct the Basic Auth string
  const authString = 'Basic ' + Buffer.from(authUser + ':' + authPass).toString('base64');
  
  // Require Basic authentication
  if (typeof headers.authorization == 'undefined' || headers.authorization[0].value != authString) {
    const body = 'Unauthorized';
    const response = {
      status: '401',
      statusDescription: 'Unauthorized',
      body: body,
      headers: {
        'www-authenticate': [{key: 'WWW-Authenticate', value:'Basic'}]
      },
    };
    callback(null, response);
    return;
  }
  
  // Continue request processing if authentication passed
  callback(null, request);
};
`),
      description: props.passThrough 
        ? `Pass-through function for ${props.stage} environment (no authentication)` 
        : `Basic authentication for ${props.stage} environment`
    });
  }
}
