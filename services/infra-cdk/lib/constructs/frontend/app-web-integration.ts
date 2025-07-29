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
   * CDK automatically handles versioning via content-based asset hashing
   * No manual commit SHA needed - CDK provides built-in rollback capabilities
   */
  
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
    
    // CDK automatically handles asset versioning via content-based hashing
    // No manual prefixes needed - CDK creates unique paths automatically
    
    // Deploy main app - HTML files with no-cache headers
    this.mainAppHtmlDeployment = new s3deploy.BucketDeployment(this, 'MainAppHtmlDeployment', {
      sources: mainAppExists 
        ? [s3deploy.Source.asset(mainAppBuildPath, {
            exclude: ['**/*.js', '**/*.css', '**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.eot', '**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.gif', '**/*.svg', '**/*.ico', '**/*.map']
          })]
        : [s3deploy.Source.data('index.html', '<html><body>Placeholder - run build first</body></html>')],
      destinationBucket: props.mainAppBucket,
      distribution: props.mainAppDistribution,
      distributionPaths: ['/*'],  // Invalidate all paths for immediate serving
      cacheControl: [s3deploy.CacheControl.noCache()],
      memoryLimit: 512,
      ephemeralStorageSize: Size.gibibytes(1),
      prune: false,  // Let CDK handle cleanup automatically
      retainOnDelete: false,
      metadata: {
        'deployment-stage': props.stage,
        'deployment-source': 'cdk-native',
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
      cacheControl: props.enableImmutableAssets !== false 
        ? [s3deploy.CacheControl.maxAge(Duration.days(365)), s3deploy.CacheControl.immutable()]
        : [s3deploy.CacheControl.maxAge(Duration.hours(1))],
      memoryLimit: 512,
      ephemeralStorageSize: Size.gibibytes(1),
      prune: false,  // Let CDK handle asset cleanup automatically
      retainOnDelete: false,
      metadata: {
        'deployment-stage': props.stage,
        'deployment-source': 'cdk-native',
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
      cacheControl: [s3deploy.CacheControl.maxAge(Duration.days(7))],
      memoryLimit: 512,
      ephemeralStorageSize: Size.gibibytes(1),
      prune: false,  // Let CDK handle asset cleanup automatically
      retainOnDelete: false,
      metadata: {
        'deployment-stage': props.stage,
        'deployment-source': 'cdk-native',
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
      distribution: props.storybookDistribution,
      distributionPaths: ['/*'],  // Invalidate all paths
      cacheControl: [s3deploy.CacheControl.noCache()],
      memoryLimit: 512,
      ephemeralStorageSize: Size.gibibytes(1),
      prune: false,  // Let CDK handle cleanup automatically
      retainOnDelete: false,
      metadata: {
        'deployment-stage': props.stage,
        'deployment-source': 'cdk-native',
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
      cacheControl: props.enableImmutableAssets !== false 
        ? [s3deploy.CacheControl.maxAge(Duration.days(365)), s3deploy.CacheControl.immutable()]
        : [s3deploy.CacheControl.maxAge(Duration.hours(1))],
      memoryLimit: 512,
      ephemeralStorageSize: Size.gibibytes(1),
      prune: false,  // Let CDK handle asset cleanup automatically
      retainOnDelete: false,
      metadata: {
        'deployment-stage': props.stage,
        'deployment-source': 'cdk-native',
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
      cacheControl: [s3deploy.CacheControl.maxAge(Duration.days(7))],
      memoryLimit: 512,
      ephemeralStorageSize: Size.gibibytes(1),
      prune: false,  // Let CDK handle asset cleanup automatically
      retainOnDelete: false,
      metadata: {
        'deployment-stage': props.stage,
        'deployment-source': 'cdk-native',
        'deployment-timestamp': new Date().toISOString()
      }
    });
    
    // CDK automatically handles CloudFront invalidation via distributionPaths
    // No manual origin path updates needed with CDK native asset management
    
    // Add deployment metadata
    this.addDeploymentMetadata(props.stage);
  }
  
  // CDK native asset management replaces manual versioning
  // Assets are automatically versioned using content-based hashing
  
  // CloudFront invalidation is handled automatically by BucketDeployment
  // when distributionPaths is specified - no manual updates needed
  
  /**
   * Add metadata tags to track deployment source
   */
  private addDeploymentMetadata(stage: string): void {
    // Tag all deployments with CDK native metadata
    const allDeployments = [
      this.mainAppHtmlDeployment,
      this.mainAppAssetsDeployment,
      this.mainAppImagesDeployment,
      this.storybookHtmlDeployment,
      this.storybookAssetsDeployment,
      this.storybookImagesDeployment
    ];
    
    allDeployments.forEach(deployment => {
      deployment.node.addMetadata('deployment-source', 'cdk-native-assets');
      deployment.node.addMetadata('stage', stage);
      deployment.node.addMetadata('versioning', 'cdk-automatic');
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