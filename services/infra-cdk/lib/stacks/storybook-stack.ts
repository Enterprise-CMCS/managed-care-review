import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { stackName } from '../config';

export interface StorybookStackProps extends StackProps {
  stage: string;
  /**
   * Optional custom domain configuration for Storybook
   */
  storybookDomainName?: string;
  storybookCertificateArn?: string;
}

/**
 * Storybook stack for static website hosting
 * Exact parity with services/storybook/serverless.yml
 */
export class StorybookStack extends Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly distributionUrl: string;

  constructor(scope: Construct, id: string, props: StorybookStackProps) {
    super(scope, id, {
      ...props,
      stackName: stackName('Storybook', props.stage),
      description: 'Storybook stack for Managed Care Review - Static website hosting'
    });

    // Create S3 bucket for Storybook
    this.bucket = new s3.Bucket(this, 'S3Bucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      enforceSSL: true
    });

    // Create Origin Access Identity
    const oai = new cloudfront.OriginAccessIdentity(this, 'CloudFrontOriginAccessIdentity', {
      comment: 'OAI to prevent direct public access to the bucket'
    });

    // Grant read access to OAI
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [oai.grantPrincipal],
      actions: ['s3:GetObject'],
      resources: [`${this.bucket.bucketArn}/*`]
    }));

    // Create WAF WebACL (geo-restriction only, matching serverless)
    const webAcl = new wafv2.CfnWebACL(this, 'CloudFrontWebAcl', {
      scope: 'CLOUDFRONT',
      defaultAction: {
        block: {}
      },
      rules: [
        {
          name: `${props.stage}-allow-usa-plus-territories`,
          priority: 0,
          action: {
            allow: {}
          },
          statement: {
            geoMatchStatement: {
              countryCodes: [
                'GU', // Guam
                'PR', // Puerto Rico
                'US', // USA
                'UM', // US Minor Outlying Islands
                'VI', // US Virgin Islands
                'MP', // Northern Mariana Islands
              ]
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'WafWebAcl'
          }
        }
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${props.stage}-webacl`
      }
    });

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', {
      comment: 'CloudFront Distro for the static website hosted in S3',
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity: oai
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        compress: true,
        cachePolicy: new cloudfront.CachePolicy(this, 'StorybookCachePolicy', {
          enableAcceptEncodingGzip: true,
          queryStringBehavior: cloudfront.CacheQueryStringBehavior.all()
        })
      },
      defaultRootObject: 'index.html',
      httpVersion: cloudfront.HttpVersion.HTTP2,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 403,  // Matches serverless: 403→403 (not 200)
          responsePagePath: '/index.html'
        }
      ],
      webAclId: webAcl.attrArn,
      logBucket: this.bucket,
      logFilePrefix: `${props.stage}-storybook-cloudfront-logs/`,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1, // Matches serverless exactly
      domainNames: props.storybookDomainName ? [props.storybookDomainName] : undefined,
      certificate: props.storybookCertificateArn ? 
        acm.Certificate.fromCertificateArn(this, 'Certificate', props.storybookCertificateArn) : 
        undefined
    });

    this.distributionUrl = `https://${this.distribution.distributionDomainName}`;

    // Outputs for GitHub Actions workflow
    new CfnOutput(this, 'StorybookUrl', {
      value: this.distributionUrl,
      description: 'Storybook CloudFront URL for GitHub Actions'
    });

    // Outputs for app-web cf: lookups (serverless compatibility)
    new CfnOutput(this, 'S3BucketName', {
      value: this.bucket.bucketName,
      exportName: `storybook-${props.stage}-S3BucketName`,
      description: 'Storybook S3 bucket name for cf: lookups'
    });

    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      exportName: `storybook-${props.stage}-CloudFrontDistributionId`,
      description: 'Storybook CloudFront distribution ID for cf: lookups'
    });

    new CfnOutput(this, 'CloudFrontEndpointUrl', {
      value: this.distributionUrl,
      exportName: `storybook-${props.stage}-CloudFrontEndpointUrl`,
      description: 'Storybook CloudFront URL for cf: lookups'
    });
  }
}