import { IAspect, Tags } from "aws-cdk-lib";
import { IConstruct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { ServiceRegistry } from "../constructs/base/service-registry";

/**
 * Lambda Monitoring Aspect - Automatically applies monitoring layers and configuration
 * to all Lambda functions in the application.
 * 
 * This aspect:
 * - Always adds OTEL layer for New Relic monitoring
 * - Conditionally adds Datadog Extension for dual monitoring
 * - Configures proper tagging for both platforms
 * - Grants necessary IAM permissions
 */
export class LambdaMonitoringAspect implements IAspect {
  constructor(
    private stage: string,
    private datadogApiKeyArn: string,
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
    
    // Check if function already has OTEL layer from stack definition
    // This prevents duplicate layer references
    const existingLayers = (node as any).layers || [];
    const hasOtelLayer = existingLayers.some((layer: lambda.ILayerVersion) => {
      // Check various ways the layer ARN might be stored
      const layerArn = (layer as any).layerVersionArn || 
                       (layer as any).layerArn || 
                       layer.layerVersionArn ||
                       '';
      // Convert to string in case it's a Token
      const arnString = String(layerArn);
      return arnString.includes('aws-otel-nodejs');
    });
    
    // Also check if we've already added monitoring via aspect
    const hasAspectOtelLayer = node.node.tryFindChild(`${node.node.id}-AspectOtelLayer`);
    
    // Only add OTEL layer if it doesn't exist
    if (!hasOtelLayer && !hasAspectOtelLayer) {
      const otelLayer = lambda.LayerVersion.fromLayerVersionArn(
        node, 
        `${node.node.id}-AspectOtelLayer`,  // Use unique ID to track aspect-added layers
        ServiceRegistry.getLayerArn(node, this.stage, 'otel')
      );
      node.addLayers(otelLayer);
    }
    
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
    
    // Extract clean service name from function name
    // e.g., "mcr-cdk-graphql-api-dev-cdk" -> "graphql-api"
    const service = fn.node.id
      .replace(/^mcr-cdk-/, '')
      .replace(/-dev-cdk$|-val-cdk$|-prod-cdk$/, '')
      .replace(/-\w+-cdk$/, '') || 'mcr';
    
    // Add Datadog environment variables (these become DD tags automatically)
    fn.addEnvironment('DD_API_KEY_SECRET_ARN', this.datadogApiKeyArn);
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
    
    // Note: The Datadog Extension handles fetching the API key from Secrets Manager
    // using DD_API_KEY_SECRET_ARN - no additional IAM permissions needed
    
    // Apply AWS resource tags (these flow to Datadog automatically)
    Tags.of(fn).add('dd_service', service);
    Tags.of(fn).add('dd_env', this.stage);
    Tags.of(fn).add('dd_team', 'managed-care-review');
  }
}