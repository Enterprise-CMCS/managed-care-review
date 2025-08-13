import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Duration, Stack, CfnOutput } from 'aws-cdk-lib';
import { ResourceNames } from '@config/index';

export interface StaticWebsiteProps {
  /**
   * Name of the website/service
   */
  websiteName: string;

  /**
   * Stage name (dev, val, prod)
   */
  stage: string;

  /**
   * WAF WebACL to associate with CloudFront
   */
  webAcl?: wafv2.CfnWebACL;

  /**
   * Optional custom domain configuration
   */
  customDomain?: {
    domainName: string;
    certificateArn: string;
    minimumProtocolVersion?: string;
  };

  /**
   * CloudFront functions to associate
   */
  cloudfrontFunctions?: {
    viewerResponse?: cloudfront.Function;
  };

  /**
   * Response headers policy
   */
  responseHeadersPolicy?: cloudfront.ResponseHeadersPolicy;

  /**
   * Lambda@Edge functions to associate
   */
  edgeLambdas?: {
    viewerRequest?: cloudfront.experimental.EdgeFunction;
    viewerResponse?: cloudfront.experimental.EdgeFunction;
    originRequest?: cloudfront.experimental.EdgeFunction;
    originResponse?: cloudfront.experimental.EdgeFunction;
  };

  /**
   * Error response code (200 for SPA, 403 for static)
   */
  errorResponseCode: number;
}

/**
 * Static website hosting with S3 and CloudFront
 * Implements the exact pattern from serverless UI configurations
 */
export class StaticWebsite extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly oai: cloudfront.OriginAccessIdentity;
  public readonly distributionUrl: string;

  constructor(scope: Construct, id: string, props: StaticWebsiteProps) {
    super(scope, id);

    // Create S3 bucket for static hosting
    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: `${ResourceNames.resourceName(props.websiteName, 'static', props.stage)}-cdk`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      enforceSSL: true,
    });

    // Create Origin Access Identity
    this.oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI to prevent direct public access to the ${props.websiteName} bucket`,
    });

    // Grant OAI read access to bucket
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [this.oai.grantPrincipal],
        actions: ['s3:GetObject'],
        resources: [`${this.bucket.bucketArn}/*`],
      })
    );

    // Create cache policy that forwards query strings (matching serverless)
    const cachePolicy = new cloudfront.CachePolicy(this, 'SPACachePolicy', {
      cachePolicyName: `${props.websiteName}-${props.stage}-spa-cache-policy`,
      comment: 'Cache policy for SPA with query string forwarding',
      defaultTtl: Duration.seconds(0),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(31536000),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // Create CloudFront distribution
    const distributionProps: cloudfront.DistributionProps = {
      comment: `CloudFront Distro for the ${props.websiteName} static website hosted in S3`,
      defaultRootObject: 'index.html',
      httpVersion: cloudfront.HttpVersion.HTTP2,

      defaultBehavior: {
        origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessIdentity(this.bucket, {
          originAccessIdentity: this.oai,
        }),
        compress: true,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        cachePolicy: cachePolicy,
        responseHeadersPolicy: props.responseHeadersPolicy,
        functionAssociations: props.cloudfrontFunctions?.viewerResponse
          ? [
              {
                function: props.cloudfrontFunctions.viewerResponse,
                eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
              },
            ]
          : undefined,
        edgeLambdas: this.buildEdgeLambdas(props.edgeLambdas),
      },

      // Additional cache behaviors for static assets
      additionalBehaviors: {
        '/_next/static/*': {
          origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessIdentity(this.bucket, {
            originAccessIdentity: this.oai,
          }),
          compress: true,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          responseHeadersPolicy: props.responseHeadersPolicy,
        },
        '/static/*': {
          origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessIdentity(this.bucket, {
            originAccessIdentity: this.oai,
          }),
          compress: true,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          cachePolicy: new cloudfront.CachePolicy(this, 'StaticCachePolicy', {
            cachePolicyName: `${props.websiteName}-${props.stage}-static-cache-policy`,
            defaultTtl: Duration.hours(1),
            minTtl: Duration.seconds(0),
            maxTtl: Duration.hours(24),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
          }),
          responseHeadersPolicy: props.responseHeadersPolicy,
        },
      },

      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: props.errorResponseCode,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],

      webAclId: props.webAcl?.attrArn,

      // Custom domain configuration
      domainNames: props.customDomain ? [props.customDomain.domainName] : undefined,
      certificate: props.customDomain
        ? acm.Certificate.fromCertificateArn(this, 'Certificate', props.customDomain.certificateArn)
        : undefined,

      // Logging configuration (always enabled to match serverless)
      enableLogging: true,
      logBucket: this.bucket,
      logFilePrefix: `${props.stage}-${props.websiteName}-cdk-cloudfront-logs/`,
    };

    this.distribution = new cloudfront.Distribution(this, 'Distribution', distributionProps);

    // Set distribution URL
    this.distributionUrl = props.customDomain
      ? `https://${props.customDomain.domainName}`
      : `https://${this.distribution.distributionDomainName}`;

    // Outputs
    new CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: `S3 bucket name for ${props.websiteName}`,
    });

    new CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: `CloudFront distribution ID for ${props.websiteName}`,
    });

    new CfnOutput(this, 'DistributionUrl', {
      value: this.distributionUrl,
      description: `CloudFront URL for ${props.websiteName}`,
    });
  }

  /**
   * Grant deployment permissions to a principal
   * Used for CI/CD to upload files and invalidate cache
   */
  public grantDeployment(grantee: iam.IGrantable): void {
    // Grant S3 permissions for deployment
    this.bucket.grantReadWrite(grantee);
    this.bucket.grantDelete(grantee);

    // Grant CloudFront invalidation permissions
    const cfStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cloudfront:CreateInvalidation'],
      resources: [
        `arn:aws:cloudfront::${Stack.of(this).account}:distribution/${this.distribution.distributionId}`,
      ],
    });

    if (grantee instanceof iam.Role) {
      grantee.addToPolicy(cfStatement);
    }
  }

  /**
   * Build edge lambda associations
   */
  private buildEdgeLambdas(
    edgeLambdas?: StaticWebsiteProps['edgeLambdas']
  ): cloudfront.EdgeLambda[] | undefined {
    if (!edgeLambdas) return undefined;

    const associations: cloudfront.EdgeLambda[] = [];

    if (edgeLambdas.viewerRequest) {
      associations.push({
        functionVersion: edgeLambdas.viewerRequest.currentVersion,
        eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
      });
    }

    if (edgeLambdas.viewerResponse) {
      associations.push({
        functionVersion: edgeLambdas.viewerResponse.currentVersion,
        eventType: cloudfront.LambdaEdgeEventType.VIEWER_RESPONSE,
      });
    }

    if (edgeLambdas.originRequest) {
      associations.push({
        functionVersion: edgeLambdas.originRequest.currentVersion,
        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
      });
    }

    if (edgeLambdas.originResponse) {
      associations.push({
        functionVersion: edgeLambdas.originResponse.currentVersion,
        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
      });
    }

    return associations.length > 0 ? associations : undefined;
  }
}
