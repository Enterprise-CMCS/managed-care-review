import { IAspect, Tags } from "aws-cdk-lib";
import { IConstruct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { ServiceRegistry } from "../constructs/base/service-registry";

/**
 * Lambda Monitoring Aspect - Automatically applies DataDog monitoring
 * to all Lambda functions in the application.
 * 
 * This aspect:
 * - Only adds DataDog Extension for monitoring (OTEL handled by constructs)
 * - Configures proper tagging for DataDog
 * - Grants necessary IAM permissions
 */
export class LambdaMonitoringAspect implements IAspect {
  constructor(
    private stage: string,
    private datadogSecretSsmParam: string,  // Now it's the SSM parameter name
    private enableDatadog: boolean = false
  ) {}

  public visit(node: IConstruct): void {
    if (!(node instanceof lambda.Function)) return;
    
    // Skip Lambda@Edge functions - they don't support environment variables or layers
    // Check for common edge function patterns
    const isEdgeFunction = 
      node.node.path.includes('BasicAuth') ||
      node.node.path.includes('EdgeFunction') ||
      node.node.path.includes('CloudFront') ||
      node.functionName.includes('edge') ||
      node.functionName.includes('BasicAuth');
    
    if (isEdgeFunction) {
      // Skip monitoring for Lambda@Edge functions
      return;
    }
    
    // Only handle DataDog monitoring (OTEL handled by individual constructs)
    const existingLayers = (node as any).layers || [];
    
    // Conditionally add Datadog monitoring
    if (this.enableDatadog) {
      // Check if Datadog Extension already added (either by stack or aspect)
      const hasDatadogExtension = existingLayers.some((layer: lambda.ILayerVersion) => {
        const layerArn = (layer as any).layerVersionArn || 
                         (layer as any).layerArn || 
                         layer.layerVersionArn ||
                         '';
        const arnString = String(layerArn);
        return arnString.includes('Datadog-Extension');
      });
      
      const hasAspectDatadogExtension = node.node.tryFindChild(`${node.node.id}-AspectDDExt`);
      
      if (!hasDatadogExtension && !hasAspectDatadogExtension) {
        this.applyDatadogMonitoring(node);
      }
    }
  }
  
  private applyDatadogMonitoring(fn: lambda.Function): void {
    // Add Datadog Extension layer
    const ddExtension = lambda.LayerVersion.fromLayerVersionArn(
      fn,
      `${fn.node.id}-AspectDDExt`,  // Use unique ID for aspect-added Datadog Extension
      ServiceRegistry.getLayerArn(fn, this.stage, 'datadog-extension')
    );
    fn.addLayers(ddExtension);
    
    // Grant permission to read Datadog API key from Secrets Manager
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [`arn:aws:secretsmanager:*:*:secret:*mcr-cdk/${this.stage}/datadog-api-key*`]
    }));
    
    // Extract clean service name from function name
    // e.g., "mcr-cdk-graphql-api-dev-cdk" -> "graphql-api"
    const service = fn.node.id
      .replace(/^mcr-cdk-/, '')
      .replace(/-dev-cdk$|-val-cdk$|-prod-cdk$/, '')
      .replace(/-\w+-cdk$/, '') || 'mcr';
    
    // Resolve SSM parameter within the function's stack scope
    const datadogSecretArn = ssm.StringParameter.valueForStringParameter(
      fn, 
      this.datadogSecretSsmParam
    );
    
    // Add Datadog environment variables (these become DD tags automatically)
    fn.addEnvironment('DD_API_KEY_SECRET_ARN', datadogSecretArn);
    fn.addEnvironment('DD_SITE', 'ddog-gov.com');  // GovCloud endpoint
    
    // Required Datadog tags for Unified Service Tagging
    fn.addEnvironment('DD_ENV', this.stage);
    fn.addEnvironment('DD_SERVICE', service);
    fn.addEnvironment('DD_VERSION', process.env.GITHUB_SHA?.substring(0, 8) || 'latest');
    
    // Additional tags (team is required)
    fn.addEnvironment('DD_TAGS', 'team:managed-care-review,project:mcr');
    
    // Optional: Enhanced monitoring features
    fn.addEnvironment('DD_ENHANCED_METRICS', 'true');
    fn.addEnvironment('DD_CAPTURE_LAMBDA_PAYLOAD', 'false'); // Security: don't capture payloads
    fn.addEnvironment('DD_TRACE_ENABLED', 'true');
    fn.addEnvironment('DD_LOGS_INJECTION', 'true');
    
    // Explicitly disable log collection - logs go to Splunk only
    fn.addEnvironment('DD_SERVERLESS_LOGS_ENABLED', 'false');
    
    // Note: The Datadog Extension handles fetching the API key from Secrets Manager
    // using DD_API_KEY_SECRET_ARN - no additional IAM permissions needed
    
    // Apply AWS resource tags (these flow to Datadog automatically)
    Tags.of(fn).add('dd_service', service);
    Tags.of(fn).add('dd_env', this.stage);
    Tags.of(fn).add('team', 'MC-Review');
  }
}