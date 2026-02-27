import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import { type Construct } from 'constructs'
import {
    Bucket,
    BucketEncryption,
    BlockPublicAccess,
    ObjectOwnership,
    type IBucket,
} from 'aws-cdk-lib/aws-s3'
import { RemovalPolicy, Duration } from 'aws-cdk-lib'
import {
    Distribution,
    OriginAccessIdentity,
    Function as CloudFrontFunction,
    FunctionCode,
    FunctionRuntime,
    HttpVersion,
    ViewerProtocolPolicy,
    AllowedMethods,
    FunctionEventType,
    SecurityPolicyProtocol,
} from 'aws-cdk-lib/aws-cloudfront'
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2'
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam'
import {
    type ICertificate,
    Certificate,
} from 'aws-cdk-lib/aws-certificatemanager'
import { CfnOutput } from 'aws-cdk-lib'
import { ResourceNames } from '../config/shared'

/**
 * Frontend infrastructure stack - S3 + CloudFront + WAF for both main app and storybook
 * Infrastructure only - no app deployment
 */
export class FrontendInfraStack extends BaseStack {
    public readonly bucket: Bucket
    public readonly distribution: Distribution
    public readonly applicationUrl: string

    // Storybook resources
    public readonly storybookBucket: Bucket
    public readonly storybookDistribution: Distribution
    public readonly storybookUrl: string

    // Access logs bucket (only for val/prod)
    public readonly accessLogsBucket?: IBucket

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            description:
                'Frontend infrastructure - S3 buckets and CloudFront distributions for React app and Storybook',
        })

        // Get optional custom domain configuration from environment
        const cloudfrontCertArn = process.env.CLOUDFRONT_CERT_ARN
        const cloudfrontDomainName = process.env.CLOUDFRONT_DOMAIN_NAME
        const cloudfrontStorybookDomainName =
            process.env.CLOUDFRONT_SB_DOMAIN_NAME

        // Check if custom domain is configured (both cert and domain must be set)
        const hasCustomDomain =
            cloudfrontCertArn &&
            cloudfrontCertArn !== '' &&
            cloudfrontDomainName &&
            cloudfrontDomainName !== ''

        const hasCustomStorybookDomain =
            cloudfrontCertArn &&
            cloudfrontCertArn !== '' &&
            cloudfrontStorybookDomainName &&
            cloudfrontStorybookDomainName !== ''

        // Import certificate if custom domain is configured
        let certificate: ICertificate | undefined
        if (hasCustomDomain || hasCustomStorybookDomain) {
            certificate = Certificate.fromCertificateArn(
                this,
                'CloudFrontCertificate',
                cloudfrontCertArn!
            )
        }

        // Create dedicated access logs bucket for val/prod environments
        // Review and dev environments don't need access logs
        if (this.stage === 'val' || this.stage === 'prod') {
            this.accessLogsBucket = this.createAccessLogsBucket()
        }

        // Create S3 bucket
        this.bucket = new Bucket(this, 'S3Bucket', {
            bucketName: ResourceNames.resourceName('ui', 'bucket', this.stage),
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'index.html',
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            objectOwnership: ObjectOwnership.OBJECT_WRITER,
            enforceSSL: true,
        })

        // Create Origin Access Identity
        const oai = new OriginAccessIdentity(
            this,
            'CloudFrontOriginAccessIdentity',
            {
                comment: 'OAI to prevent direct public access to the bucket',
            }
        )

        // Grant OAI access to bucket
        this.bucket.addToResourcePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                principals: [oai.grantPrincipal],
                actions: ['s3:GetObject'],
                resources: [`${this.bucket.bucketArn}/*`],
            })
        )

        // Create WAF
        const webAcl = new CfnWebACL(this, 'CloudFrontWebAcl', {
            scope: 'CLOUDFRONT',
            defaultAction: { block: {} },
            rules: [
                {
                    name: `${this.stage}-allow-usa-plus-territories`,
                    priority: 0,
                    action: { allow: {} },
                    statement: {
                        geoMatchStatement: {
                            countryCodes: ['GU', 'PR', 'US', 'UM', 'VI', 'MP'],
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'WafWebAcl',
                    },
                },
            ],
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                sampledRequestsEnabled: true,
                metricName: `${this.stage}-webacl`,
            },
        })

        // Create HSTS function
        const hstsFunction = new CloudFrontFunction(
            this,
            'HstsCloudfrontFunction',
            {
                functionName: `hsts-${this.stage}-cdk`,
                comment: 'This function adds headers to implement HSTS',
                code: FunctionCode.fromInline(`
function handler(event) {
    var response = event.response;
    var headers = response.headers;
    headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload'};
    return response;
}`),
                runtime: FunctionRuntime.JS_1_0,
            }
        )

        // Create CloudFront distribution
        this.distribution = new Distribution(this, 'CloudFrontDistribution', {
            comment: 'CloudFront Distro for the static website hosted in S3',
            defaultRootObject: 'index.html',
            httpVersion: HttpVersion.HTTP2,

            // Add custom domain aliases if configured
            domainNames: hasCustomDomain ? [cloudfrontDomainName!] : undefined,
            certificate: hasCustomDomain ? certificate : undefined,

            defaultBehavior: {
                origin: S3BucketOrigin.withOriginAccessIdentity(this.bucket, {
                    originAccessIdentity: oai,
                }),
                compress: true,
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
                functionAssociations: [
                    {
                        function: hstsFunction,
                        eventType: FunctionEventType.VIEWER_RESPONSE,
                    },
                ],
            },

            // SPA routing - return index.html for 403 errors
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
            ],

            webAclId: webAcl.attrArn,

            // Security: Enforce TLS 1.2 as minimum protocol version (Security Hub compliance)
            minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,

            // CloudFront access logs - only enabled for val/prod, logged to dedicated bucket
            enableLogging: this.accessLogsBucket ? true : false,
            logBucket: this.accessLogsBucket,
            logFilePrefix: this.accessLogsBucket
                ? `${this.stage}-ui-cloudfront-logs/`
                : undefined,
        })

        // Set application URL - use custom domain if configured, otherwise CloudFront URL
        this.applicationUrl = hasCustomDomain
            ? `https://${cloudfrontDomainName}/` // Trailing slash for custom domains
            : `https://${this.distribution.distributionDomainName}`

        // Create storybook S3 bucket
        this.storybookBucket = new Bucket(this, 'StorybookS3Bucket', {
            bucketName: ResourceNames.resourceName(
                'storybook',
                'bucket',
                this.stage
            ),
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'index.html',
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            objectOwnership: ObjectOwnership.OBJECT_WRITER,
            enforceSSL: true,
        })

        // Create storybook Origin Access Identity
        const storybookOai = new OriginAccessIdentity(
            this,
            'StorybookCloudFrontOriginAccessIdentity',
            {
                comment:
                    'OAI to prevent direct public access to the storybook bucket',
            }
        )

        // Grant storybook OAI access to bucket
        this.storybookBucket.addToResourcePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                principals: [storybookOai.grantPrincipal],
                actions: ['s3:GetObject'],
                resources: [`${this.storybookBucket.bucketArn}/*`],
            })
        )

        // Create storybook CloudFront distribution
        this.storybookDistribution = new Distribution(
            this,
            'StorybookCloudFrontDistribution',
            {
                comment:
                    'CloudFront Distro for the storybook static website hosted in S3',
                defaultRootObject: 'index.html',
                httpVersion: HttpVersion.HTTP2,

                // Add custom domain aliases if configured
                domainNames: hasCustomStorybookDomain
                    ? [cloudfrontStorybookDomainName!]
                    : undefined,
                certificate: hasCustomStorybookDomain ? certificate : undefined,

                defaultBehavior: {
                    origin: S3BucketOrigin.withOriginAccessIdentity(
                        this.storybookBucket,
                        {
                            originAccessIdentity: storybookOai,
                        }
                    ),
                    compress: true,
                    viewerProtocolPolicy:
                        ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
                },

                // Storybook error handling - return 403 for error responses
                errorResponses: [
                    {
                        httpStatus: 403,
                        responseHttpStatus: 403,
                        responsePagePath: '/index.html',
                    },
                ],

                webAclId: webAcl.attrArn,

                // Security: Enforce TLS 1.2 as minimum protocol version (Security Hub compliance)
                minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,

                // CloudFront access logs - only enabled for val/prod, logged to dedicated bucket
                enableLogging: this.accessLogsBucket ? true : false,
                logBucket: this.accessLogsBucket,
                logFilePrefix: this.accessLogsBucket
                    ? `${this.stage}-storybook-cloudfront-logs/`
                    : undefined,
            }
        )

        // Set storybook URL - use custom domain if configured, otherwise CloudFront URL
        this.storybookUrl = hasCustomStorybookDomain
            ? `https://${cloudfrontStorybookDomainName}/` // Trailing slash for custom domains
            : `https://${this.storybookDistribution.distributionDomainName}`

        this.createOutputs()
    }

    /**
     * Create a dedicated S3 bucket for CloudFront access logs
     * Only used for val/prod environments
     */
    private createAccessLogsBucket(): Bucket {
        const logRetentionDays = this.stage === 'prod' ? 180 : 90

        return new Bucket(this, 'AccessLogsBucket', {
            bucketName: ResourceNames.resourceName(
                'cloudfront-logs',
                'bucket',
                this.stage
            ),
            // CloudFront requires BUCKET_OWNER_PREFERRED for access logs
            objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            // Retain logs bucket for val/prod - never auto-delete
            removalPolicy: RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
            versioned: false, // No need to version logs
            lifecycleRules: [
                {
                    id: 'expire-old-logs',
                    expiration: Duration.days(logRetentionDays),
                },
                {
                    id: 'delete-incomplete-multipart-uploads',
                    abortIncompleteMultipartUploadAfter: Duration.days(7),
                },
            ],
        })
    }

    private createOutputs(): void {
        new CfnOutput(this, 'S3BucketName', {
            value: this.bucket.bucketName,
            exportName: this.exportName('S3BucketName'),
            description: 'S3 bucket for React app',
        })

        new CfnOutput(this, 'CloudFrontDistributionId', {
            value: this.distribution.distributionId,
            exportName: this.exportName('CloudFrontDistributionId'),
            description: 'CloudFront distribution ID',
        })

        new CfnOutput(this, 'CloudFrontEndpointUrl', {
            // Always export the CloudFront domain (not custom domain) to maintain stable exports
            value: `https://${this.distribution.distributionDomainName}`,
            exportName: this.exportName('CloudFrontEndpointUrl'),
            description: 'CloudFront URL for React app',
        })

        // Export application URL (custom domain if configured, otherwise CloudFront domain)
        // This is used by get-cdk-config.sh to build the React app with the correct redirect URL
        new CfnOutput(this, 'ApplicationUrl', {
            value: this.applicationUrl,
            exportName: this.exportName('ApplicationUrl'),
            description: 'Application URL (custom domain or CloudFront)',
        })

        // Storybook outputs
        new CfnOutput(this, 'StorybookS3BucketName', {
            value: this.storybookBucket.bucketName,
            exportName: this.exportName('StorybookS3BucketName'),
            description: 'S3 bucket for Storybook',
        })

        new CfnOutput(this, 'StorybookCloudFrontDistributionId', {
            value: this.storybookDistribution.distributionId,
            exportName: this.exportName('StorybookCloudFrontDistributionId'),
            description: 'CloudFront distribution ID for Storybook',
        })

        new CfnOutput(this, 'StorybookCloudFrontEndpointUrl', {
            // Always export the CloudFront domain (not custom domain) to maintain stable exports
            value: `https://${this.storybookDistribution.distributionDomainName}`,
            exportName: this.exportName('StorybookCloudFrontEndpointUrl'),
            description: 'CloudFront URL for Storybook',
        })
    }
}
