import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import { RemovalPolicy, Duration, Size, Stack } from 'aws-cdk-lib';
import * as path from 'path';
import * as fs from 'fs';

export interface AppWebIntegrationProps {
  /**
   * The S3 bucket for the main app
   */
  mainAppBucket: s3.IBucket;
  
  /**
   * The S3 bucket for storybook
   */
  storybookBucket: s3.IBucket;
  
  /**
   * The CloudFront distribution for the main app
   */
  mainAppDistribution: cloudfront.IDistribution;
  
  /**
   * The CloudFront distribution for storybook
   */
  storybookDistribution: cloudfront.IDistribution;
  
  /**
   * Stage name
   */
  stage: string;
  
  /**
   * Path to app-web directory (relative to CDK app root)
   */
  appWebPath?: string;
  
  /**
   * Commit SHA for versioning deployments
   * This enables rollback and prevents concurrent deployment conflicts
   */
  commitSha?: string;
  
  /**
   * Enable immutable asset caching
   * When true, sets long cache headers for hashed assets
   */
  enableImmutableAssets?: boolean;
}

/**
 * Integration construct for deploying app-web build outputs to CDK infrastructure
 * This allows side-by-side deployment without modifying serverless configuration
 */
export class AppWebIntegration extends Construct {
  public readonly mainAppHtmlDeployment: s3deploy.BucketDeployment;
  public readonly mainAppAssetsDeployment: s3deploy.BucketDeployment;
  public readonly mainAppImagesDeployment: s3deploy.BucketDeployment;
  public readonly storybookHtmlDeployment: s3deploy.BucketDeployment;
  public readonly storybookAssetsDeployment: s3deploy.BucketDeployment;
  public readonly storybookImagesDeployment: s3deploy.BucketDeployment;
  
  constructor(scope: Construct, id: string, props: AppWebIntegrationProps) {
    super(scope, id);
    
    // Determine app-web path
    const appWebPath = props.appWebPath || '../app-web';
    const mainAppBuildPath = path.join(appWebPath, 'build');
    const storybookBuildPath = path.join(appWebPath, 'storybook-static');
    
    // Check if build directories exist
    const mainAppExists = fs.existsSync(mainAppBuildPath);
    const storybookExists = fs.existsSync(storybookBuildPath);
    
    if (!mainAppExists || !storybookExists) {
      console.log('AppWebIntegration: Build directories not found. Please run the following commands:');
      console.log(`  cd ${appWebPath}`);
      console.log('  pnpm install');
      console.log('  pnpm build');
      console.log('  pnpm storybook:build');
      console.log('');
      console.log('For CDK synth, creating placeholder deployments...');
    }
    
    // Determine asset prefix based on stage and commit SHA
    const assetPrefix = this.getAssetPrefix(props.stage, props.commitSha);
    
    // Deploy main app - HTML files with no-cache headers
    this.mainAppHtmlDeployment = new s3deploy.BucketDeployment(this, 'MainAppHtmlDeployment', {
      sources: mainAppExists 
        ? [s3deploy.Source.asset(mainAppBuildPath, {
            exclude: ['**/*.js', '**/*.css', '**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.eot', '**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.gif', '**/*.svg', '**/*.ico', '**/*.map']
          })]
        : [s3deploy.Source.data('index.html', '<html><body>Placeholder - run build first</body></html>')],
      destinationBucket: props.mainAppBucket,
      destinationKeyPrefix: assetPrefix,
      distribution: props.mainAppDistribution,
      distributionPaths: ['/*'],  // Invalidate all paths for immediate serving
      cacheControl: [s3deploy.CacheControl.noCache()],
      memoryLimit: 512,
      ephemeralStorageSize: Size.gibibytes(1),
      prune: true,  // Only this deployment prunes to remove old files
      retainOnDelete: false,
      metadata: {
        'deployment-stage': props.stage,
        'deployment-sha': props.commitSha || 'latest',
        'deployment-timestamp': new Date().toISOString()
      }
    });
    
    // Deploy main app - Hashed assets (JS, CSS, fonts) with immutable caching
    this.mainAppAssetsDeployment = new s3deploy.BucketDeployment(this, 'MainAppAssetsDeployment', {
      sources: mainAppExists 
        ? [s3deploy.Source.asset(mainAppBuildPath, {
            exclude: ['**/*.html', '**/*.htm', '**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.gif', '**/*.svg', '**/*.ico']
          })]
        : [],
      destinationBucket: props.mainAppBucket,
      destinationKeyPrefix: assetPrefix,
      cacheControl: props.enableImmutableAssets !== false 
        ? [s3deploy.CacheControl.maxAge(Duration.days(365)), s3deploy.CacheControl.immutable()]
        : [s3deploy.CacheControl.maxAge(Duration.hours(1))],
      memoryLimit: 512,
      ephemeralStorageSize: Size.gibibytes(1),
      prune: false,  // Don't prune to avoid deleting HTML files
      retainOnDelete: false,
      metadata: {
        'deployment-stage': props.stage,
        'deployment-sha': props.commitSha || 'latest',
        'deployment-timestamp': new Date().toISOString()
      }
    });
    
    // Deploy main app - Images with moderate caching
    this.mainAppImagesDeployment = new s3deploy.BucketDeployment(this, 'MainAppImagesDeployment', {
      sources: mainAppExists 
        ? [s3deploy.Source.asset(mainAppBuildPath, {
            exclude: ['**/*.html', '**/*.htm', '**/*.js', '**/*.css', '**/*.map', '**/*.json', '**/*.txt', '**/*.md', '**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.eot']
          })]
        : [],
      destinationBucket: props.mainAppBucket,
      destinationKeyPrefix: assetPrefix,
      cacheControl: [s3deploy.CacheControl.maxAge(Duration.days(7))],
      memoryLimit: 512,
      ephemeralStorageSize: Size.gibibytes(1),
      prune: false,  // Don't prune to avoid deleting other files
      retainOnDelete: false,
      metadata: {
        'deployment-stage': props.stage,
        'deployment-sha': props.commitSha || 'latest',
        'deployment-timestamp': new Date().toISOString()
      }
    });
    
    // Deploy storybook - HTML files with no-cache headers
    this.storybookHtmlDeployment = new s3deploy.BucketDeployment(this, 'StorybookHtmlDeployment', {
      sources: storybookExists
        ? [s3deploy.Source.asset(storybookBuildPath, {
            exclude: ['**/*.js', '**/*.css', '**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.eot', '**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.gif', '**/*.svg', '**/*.ico', '**/*.map']
          })]
        : [s3deploy.Source.data('index.html', '<html><body>Storybook placeholder - run build first</body></html>')],
      destinationBucket: props.storybookBucket,
      destinationKeyPrefix: assetPrefix,
      distribution: props.storybookDistribution,
      distributionPaths: ['/*'],  // Invalidate all paths
      cacheControl: [s3deploy.CacheControl.noCache()],
      memoryLimit: 512,
      ephemeralStorageSize: Size.gibibytes(1),
      prune: true,  // Only this deployment prunes to remove old files
      retainOnDelete: false,
      metadata: {
        'deployment-stage': props.stage,
        'deployment-sha': props.commitSha || 'latest',
        'deployment-timestamp': new Date().toISOString()
      }
    });
    
    // Deploy storybook - Hashed assets (JS, CSS, fonts) with immutable caching
    this.storybookAssetsDeployment = new s3deploy.BucketDeployment(this, 'StorybookAssetsDeployment', {
      sources: storybookExists 
        ? [s3deploy.Source.asset(storybookBuildPath, {
            exclude: ['**/*.html', '**/*.htm', '**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.gif', '**/*.svg', '**/*.ico']
          })]
        : [],
      destinationBucket: props.storybookBucket,
      destinationKeyPrefix: assetPrefix,
      cacheControl: props.enableImmutableAssets !== false 
        ? [s3deploy.CacheControl.maxAge(Duration.days(365)), s3deploy.CacheControl.immutable()]
        : [s3deploy.CacheControl.maxAge(Duration.hours(1))],
      memoryLimit: 512,
      ephemeralStorageSize: Size.gibibytes(1),
      prune: false,  // Don't prune to avoid deleting HTML files
      retainOnDelete: false,
      metadata: {
        'deployment-stage': props.stage,
        'deployment-sha': props.commitSha || 'latest',
        'deployment-timestamp': new Date().toISOString()
      }
    });
    
    // Deploy storybook - Images with moderate caching
    this.storybookImagesDeployment = new s3deploy.BucketDeployment(this, 'StorybookImagesDeployment', {
      sources: storybookExists 
        ? [s3deploy.Source.asset(storybookBuildPath, {
            exclude: ['**/*.html', '**/*.htm', '**/*.js', '**/*.css', '**/*.map', '**/*.json', '**/*.txt', '**/*.md', '**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.eot']
          })]
        : [],
      destinationBucket: props.storybookBucket,
      destinationKeyPrefix: assetPrefix,
      cacheControl: [s3deploy.CacheControl.maxAge(Duration.days(7))],
      memoryLimit: 512,
      ephemeralStorageSize: Size.gibibytes(1),
      prune: false,  // Don't prune to avoid deleting other files
      retainOnDelete: false,
      metadata: {
        'deployment-stage': props.stage,
        'deployment-sha': props.commitSha || 'latest',
        'deployment-timestamp': new Date().toISOString()
      }
    });
    
    // Update CloudFront to serve from the new version
    if (props.commitSha) {
      this.updateCloudFrontOriginPath(props);
    }
    
    // Add deployment metadata
    this.addDeploymentMetadata(props.stage, props.commitSha);
  }
  
  /**
   * Generate asset prefix for versioned deployments
   */
  private getAssetPrefix(stage: string, commitSha?: string): string {
    if (commitSha) {
      // Use stage/sha format for versioned deployments
      return `${stage}/${commitSha.substring(0, 8)}`;
    }
    // For local development or when SHA not provided
    return stage;
  }
  
  /**
   * Update CloudFront origin path to point to new version
   * This is handled by CloudFront invalidation, but we can add custom logic if needed
   */
  private updateCloudFrontOriginPath(props: AppWebIntegrationProps): void {
    // The BucketDeployment construct handles CloudFront invalidation automatically
    // when distributionPaths is specified. Additional custom logic can be added here
    // if needed for more complex scenarios.
    console.log(`Deploying version ${props.commitSha?.substring(0, 8)} to ${props.stage}`);
  }
  
  /**
   * Add metadata tags to track deployment source
   */
  private addDeploymentMetadata(stage: string, commitSha?: string): void {
    // Tag all deployments to distinguish from serverless
    const allDeployments = [
      this.mainAppHtmlDeployment,
      this.mainAppAssetsDeployment,
      this.mainAppImagesDeployment,
      this.storybookHtmlDeployment,
      this.storybookAssetsDeployment,
      this.storybookImagesDeployment
    ];
    
    allDeployments.forEach(deployment => {
      deployment.node.addMetadata('deployment-source', 'cdk-app-web-integration');
      deployment.node.addMetadata('stage', stage);
      deployment.node.addMetadata('commit-sha', commitSha || 'latest');
      deployment.node.addMetadata('deployment-timestamp', new Date().toISOString());
    });
  }
  
  /**
   * Grant deployment permissions to a role (e.g., CI/CD)
   */
  public grantDeployment(role: iam.IRole): void {
    // Grant permissions to all deployment handler roles
    const allDeployments = [
      this.mainAppHtmlDeployment,
      this.mainAppAssetsDeployment,
      this.mainAppImagesDeployment,
      this.storybookHtmlDeployment,
      this.storybookAssetsDeployment,
      this.storybookImagesDeployment
    ];
    
    allDeployments.forEach(deployment => {
      deployment.handlerRole.grantAssumeRole(role);
    });
  }
}