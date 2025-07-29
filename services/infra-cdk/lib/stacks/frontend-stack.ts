import { BaseStack, BaseStackProps, ServiceRegistry } from '@constructs/base';
import { StaticWebsite, GeoRestrictedWaf, BuildConfig, AppWebIntegration } from '@constructs/frontend';
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { SERVICES } from '@config/index';

export interface FrontendStackProps extends BaseStackProps {
  /**
   * Optional custom domain configuration for main app
   */
  appDomainName?: string;
  appCertificateArn?: string;
  
  /**
   * Optional custom domain configuration for storybook
   */
  storybookDomainName?: string;
  storybookCertificateArn?: string;
  
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
 * Implements UI and Storybook services from serverless configuration
 */
export class FrontendStack extends BaseStack {
  public mainApp: StaticWebsite;
  public storybook: StaticWebsite;
  public buildConfig: BuildConfig;
  
  // CloudFront URLs for cross-stack references
  public mainAppUrl: string;
  public storybookUrl: string;
  
  // Private properties from props
  private readonly appDomainName?: string;
  private readonly appCertificateArn?: string;
  private readonly storybookDomainName?: string;
  private readonly storybookCertificateArn?: string;
  private readonly enableHsts?: boolean;
  private readonly enableAppWebIntegration?: boolean;
  
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, {
      ...props,
      description: 'Frontend stack for Managed Care Review - Static website hosting with CloudFront'
    });
    
    // Store properties from props
    this.appDomainName = props.appDomainName;
    this.appCertificateArn = props.appCertificateArn;
    this.storybookDomainName = props.storybookDomainName;
    this.storybookCertificateArn = props.storybookCertificateArn;
    this.enableHsts = props.enableHsts;
    this.enableAppWebIntegration = props.enableAppWebIntegration;
    
    // Define resources after all properties are initialized
    this.defineResources();
  }
  
  protected defineResources(): void {
    // Create WAF WebACL for geo-restrictions
    const waf = new GeoRestrictedWaf(this, 'GeoRestriction', {
      namePrefix: 'mcr-frontend',
      stage: this.stage
    });
    
    // Create HSTS CloudFront function if enabled
    let hstsFunction: cloudfront.Function | undefined;
    if (this.enableHsts !== false) {
      hstsFunction = this.createHstsFunction();
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
      cloudfrontFunctions: {
        viewerResponse: hstsFunction
      },
      errorResponseCode: 200 // For SPA routing
    });
    
    this.mainAppUrl = this.mainApp.distributionUrl;
    
    // Create Storybook website
    this.storybook = new StaticWebsite(this, 'Storybook', {
      websiteName: 'storybook',
      stage: this.stage,
      webAcl: waf.webAcl,
      customDomain: this.storybookDomainName && this.storybookCertificateArn ? {
        domainName: this.storybookDomainName,
        certificateArn: this.storybookCertificateArn
      } : undefined,
      errorResponseCode: 403 // Storybook uses 403 for error pages
    });
    
    this.storybookUrl = this.storybook.distributionUrl;
    
    // Create build configuration manager
    this.buildConfig = new BuildConfig(this, 'BuildConfig', {
      stage: this.stage,
      authMode: process.env.VITE_APP_AUTH_MODE || 'COGNITO'
    });
    
    // Store metadata about required configuration
    // Actual configuration will be retrieved during build time
    this.buildConfig.storeConfigurationMetadata(this.mainAppUrl);
    
    // Add app-web integration if enabled
    if (this.enableAppWebIntegration) {
      // CDK native asset management handles versioning automatically
      new AppWebIntegration(this, 'AppWebIntegration', {
        mainAppBucket: this.mainApp.bucket,
        storybookBucket: this.storybook.bucket,
        mainAppDistribution: this.mainApp.distribution,
        storybookDistribution: this.storybook.distribution,
        stage: this.stage,
        appWebPath: '../app-web',
        enableImmutableAssets: true
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
   * Create HSTS CloudFront function
   * Matches serverless ui configuration exactly
   */
  private createHstsFunction(): cloudfront.Function {
    return new cloudfront.Function(this, 'HstsFunction', {
      functionName: `hsts-${this.stage}-cdk`,
      comment: 'This function adds headers to implement HSTS',
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var response = event.response;
  var headers = response.headers;
  headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload'};
  return response;
}`),
      runtime: cloudfront.FunctionRuntime.JS_1_0
    });
  }
  
  /**
   * Store values in ServiceRegistry for cross-stack references
   */
  private storeServiceRegistryValues(): void {
    // Main app values
    ServiceRegistry.putValue(this, 'frontend', 'ui-bucket-name', this.mainApp.bucket.bucketName, this.stage);
    ServiceRegistry.putValue(this, 'frontend', 'ui-distribution-id', this.mainApp.distribution.distributionId, this.stage);
    ServiceRegistry.putValue(this, 'frontend', 'ui-url', this.mainAppUrl, this.stage);
    
    // Storybook values
    ServiceRegistry.putValue(this, 'frontend', 'storybook-bucket-name', this.storybook.bucket.bucketName, this.stage);
    ServiceRegistry.putValue(this, 'frontend', 'storybook-distribution-id', this.storybook.distribution.distributionId, this.stage);
    ServiceRegistry.putValue(this, 'frontend', 'storybook-url', this.storybookUrl, this.stage);
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
        
        // Grant deployment permissions for both apps
        this.mainApp.grantDeployment(githubRole);
        this.storybook.grantDeployment(githubRole);
        
      } catch (error) {
        console.log('GitHub OIDC role not found, skipping deployment permissions');
      }
    }
  }
  
  /**
   * Create stack outputs
   */
  private createOutputs(): void {
    // Main app outputs
    new CfnOutput(this, 'MainAppBucketName', {
      value: this.mainApp.bucket.bucketName,
      exportName: this.exportName('MainAppBucketName'),
      description: 'S3 bucket for main application'
    });
    
    new CfnOutput(this, 'MainAppDistributionId', {
      value: this.mainApp.distribution.distributionId,
      exportName: this.exportName('MainAppDistributionId'),
      description: 'CloudFront distribution ID for main application'
    });
    
    new CfnOutput(this, 'ApplicationUrl', {
      value: this.mainAppUrl,
      exportName: this.exportName('ApplicationUrl'),
      description: 'CloudFront URL for main application'
    });
    
    // Storybook outputs
    new CfnOutput(this, 'StorybookBucketName', {
      value: this.storybook.bucket.bucketName,
      exportName: this.exportName('StorybookBucketName'),
      description: 'S3 bucket for Storybook'
    });
    
    new CfnOutput(this, 'StorybookDistributionId', {
      value: this.storybook.distribution.distributionId,
      exportName: this.exportName('StorybookDistributionId'),
      description: 'CloudFront distribution ID for Storybook'
    });
    
    new CfnOutput(this, 'StorybookUrl', {
      value: this.storybookUrl,
      exportName: this.exportName('StorybookUrl'),
      description: 'CloudFront URL for Storybook'
    });
  }
}