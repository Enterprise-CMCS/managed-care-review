import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import { type Construct } from 'constructs'
import {
    Bucket,
    BucketEncryption,
    BlockPublicAccess,
    ObjectOwnership,
} from 'aws-cdk-lib/aws-s3'
import {
    Distribution,
    OriginAccessIdentity,
    HttpVersion,
    ViewerProtocolPolicy,
    AllowedMethods,
} from 'aws-cdk-lib/aws-cloudfront'
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2'
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam'
import { CfnOutput } from 'aws-cdk-lib'
import { ResourceNames } from '../config'

/**
 * Storybook stack - S3 + CloudFront for Storybook documentation
 */
export class StorybookStack extends BaseStack {
    public readonly bucket: Bucket
    public readonly distribution: Distribution
    public readonly storybookUrl: string

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            description:
                'Storybook hosting - S3 bucket and CloudFront distribution',
        })

        // Create S3 bucket
        this.bucket = new Bucket(this, 'S3Bucket', {
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

        // Create WAF (matches serverless storybook config)
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

        // Create CloudFront distribution (matches serverless storybook config)
        this.distribution = new Distribution(this, 'CloudFrontDistribution', {
            comment: 'CloudFront Distro for the static website hosted in S3',
            defaultRootObject: 'index.html',
            httpVersion: HttpVersion.HTTP2,

            defaultBehavior: {
                origin: S3BucketOrigin.withOriginAccessIdentity(this.bucket, {
                    originAccessIdentity: oai,
                }),
                compress: true,
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
            },

            // Storybook error handling (403 -> 403, not SPA routing)
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 403,
                    responsePagePath: '/index.html',
                },
            ],

            webAclId: webAcl.attrArn,

            // Logging to same bucket
            enableLogging: true,
            logBucket: this.bucket,
            logFilePrefix: `${this.stage}-storybook-cloudfront-logs/`,
        })

        this.storybookUrl = `https://${this.distribution.distributionDomainName}`

        this.createOutputs()
    }

    private createOutputs(): void {
        new CfnOutput(this, 'S3BucketName', {
            value: this.bucket.bucketName,
            exportName: this.exportName('S3BucketName'),
            description: 'S3 bucket for Storybook',
        })

        new CfnOutput(this, 'CloudFrontDistributionId', {
            value: this.distribution.distributionId,
            exportName: this.exportName('CloudFrontDistributionId'),
            description: 'CloudFront distribution ID for Storybook',
        })

        new CfnOutput(this, 'CloudFrontEndpointUrl', {
            value: this.storybookUrl,
            exportName: this.exportName('CloudFrontEndpointUrl'),
            description: 'CloudFront URL for Storybook',
        })
    }
}
