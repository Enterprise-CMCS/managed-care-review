import { ServiceRegistry } from '@constructs/base';
import { Stack, StackProps } from 'aws-cdk-lib';
import { stackName } from '../config';
import { StaticWebsite, GeoRestrictedWaf, AppWebIntegration } from '@constructs/frontend';
import { BasicAuthEdgeFunction } from '@constructs/frontend/edge-functions/basic-auth';
import { SecurityHeadersPolicy } from '@constructs/frontend/security-headers-policy';
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnOutput } from 'aws-cdk-lib';
import { SERVICES } from '@config/index';

export interface FrontendStackProps extends StackProps {
  stage: string;
  /**
   * Optional custom domain configuration for main app
   */
  appDomainName?: string;
  appCertificateArn?: string;
  
  /**
   * Enable HSTS security headers
   */
  enableHsts?: boolean;
  
  /**
   * Enable app-web integration for side-by-side deployment
   * When true, deploys pre-built artifacts from app-web directory
   */
  enableAppWebIntegration?: boolean;
}

/**
 * Frontend stack for static website hosting
 * Implements UI service from serverless configuration
 */
export class FrontendStack extends Stack {
  public mainApp: StaticWebsite;
  
  // CloudFront URL for cross-stack references
  public mainAppUrl: string;
  
  // Private properties from props
  private readonly stage: string;
  private readonly appDomainName?: string;
  private readonly appCertificateArn?: string;
  private readonly enableHsts?: boolean;
  private readonly enableAppWebIntegration?: boolean;
  
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, {
      ...props,
      stackName: stackName('Frontend', props.stage),
      description: 'Frontend stack for Managed Care Review - Static website hosting with CloudFront'
    });
    
    // Store properties from props
    this.stage = props.stage;
    this.appDomainName = props.appDomainName;
    this.appCertificateArn = props.appCertificateArn;
    this.enableHsts = props.enableHsts;
    this.enableAppWebIntegration = props.enableAppWebIntegration;
    
    // Define resources after all properties are initialized
    this.defineResources();
  }
  
  private defineResources(): void {
    // Create WAF WebACL for geo-restrictions
    const waf = new GeoRestrictedWaf(this, 'GeoRestriction', {
      namePrefix: 'mcr-frontend',
      stage: this.stage
    });
    
    // Create security headers policy
    const mainAppHeadersPolicy = new SecurityHeadersPolicy(this, 'MainAppHeaders', {
      stage: this.stage,
      websiteName: SERVICES.UI,
      enableHsts: this.enableHsts
    });
    
    // Create Basic Auth Lambda@Edge for non-prod environments
    let basicAuthFunction: cloudfront.experimental.EdgeFunction | undefined;
    // Pass-through mode to match serverless (no authentication)
    if (this.stage !== 'prod') {
      const basicAuth = new BasicAuthEdgeFunction(this, 'BasicAuth', {
        stage: this.stage,
        passThrough: true  // Pass-through mode - no authentication enforcement
      });
      basicAuthFunction = basicAuth.function;
    }
    
    // Create main application website
    this.mainApp = new StaticWebsite(this, 'MainApp', {
      websiteName: SERVICES.UI,
      stage: this.stage,
      webAcl: waf.webAcl,
      customDomain: this.appDomainName && this.appCertificateArn ? {
        domainName: this.appDomainName,
        certificateArn: this.appCertificateArn
      } : undefined,
      responseHeadersPolicy: mainAppHeadersPolicy.policy,
      edgeLambdas: basicAuthFunction ? {
        viewerRequest: basicAuthFunction
      } : undefined,
      errorResponseCode: 200 // For SPA routing
    });
    
    this.mainAppUrl = this.mainApp.distributionUrl;
    
    // Add app-web integration if enabled
    if (this.enableAppWebIntegration) {
      new AppWebIntegration(this, 'AppWebIntegration', {
        mainAppBucket: this.mainApp.bucket,
        mainAppDistribution: this.mainApp.distribution,
        stage: this.stage,
        appWebPath: '../app-web',
        enableImmutableAssets: true,
        enableUnifiedStorybookDeployment: false  // Separate Storybook stack for serverless parity
      });
    }
    
    // Store frontend URLs in ServiceRegistry for cross-stack references
    this.storeServiceRegistryValues();
    
    // Grant deployment permissions to CI/CD role if it exists
    this.grantDeploymentPermissions();
    
    // Create outputs
    this.createOutputs();
  }
  
  /**
   * Store values in ServiceRegistry for cross-stack references
   */
  private storeServiceRegistryValues(): void {
    // Main app values
    ServiceRegistry.putValue(this, 'frontend', 'ui-bucket-name', this.mainApp.bucket.bucketName, this.stage);
    ServiceRegistry.putValue(this, 'frontend', 'ui-distribution-id', this.mainApp.distribution.distributionId, this.stage);
    ServiceRegistry.putValue(this, 'frontend', 'ui-url', this.mainAppUrl, this.stage);
  }
  
  /**
   * Grant deployment permissions to CI/CD role
   */
  private grantDeploymentPermissions(): void {
    // Check if GitHub OIDC role exists (from foundation stack)
    const githubRoleArn = process.env.GITHUB_ACTIONS_ROLE_ARN;
    if (githubRoleArn) {
      try {
        const githubRole = iam.Role.fromRoleArn(this, 'GitHubRole', githubRoleArn);
        
        // Grant deployment permissions for main app
        this.mainApp.grantDeployment(githubRole);
        
      } catch (error) {
        console.log('GitHub OIDC role not found, skipping deployment permissions');
      }
    }
  }
  
  /**
   * Create stack outputs
   */
  private createOutputs(): void {
    // Outputs for GitHub Actions workflow (existing format)
    new CfnOutput(this, 'ApplicationUrl', {
      value: this.mainAppUrl,
      description: 'CloudFront URL for main application'
    });
    
    // Outputs for app-web cf: lookups (serverless compatibility)
    new CfnOutput(this, 'S3BucketName', {
      value: this.mainApp.bucket.bucketName,
      exportName: `ui-${this.stage}-S3BucketName`,
      description: 'S3 bucket name for cf: lookups'
    });
    
    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.mainApp.distribution.distributionId,
      exportName: `ui-${this.stage}-CloudFrontDistributionId`,
      description: 'CloudFront distribution ID for cf: lookups'
    });
    
    new CfnOutput(this, 'CloudFrontEndpointUrl', {
      value: this.mainAppUrl,
      exportName: `ui-${this.stage}-CloudFrontEndpointUrl`,
      description: 'CloudFront URL for cf: lookups'
    });
  }
}