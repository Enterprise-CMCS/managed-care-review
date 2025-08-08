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
    Function as CloudFrontFunction,
    FunctionCode,
    FunctionRuntime,
    HttpVersion,
    ViewerProtocolPolicy,
    AllowedMethods,
    FunctionEventType,
} from 'aws-cdk-lib/aws-cloudfront'
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins'
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2'
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam'
import { CfnOutput } from 'aws-cdk-lib'
import { ResourceNames } from '../config'

/**
 * Simple frontend stack - S3 + CloudFront + WAF
 */
export class FrontendStack extends BaseStack {
    public readonly bucket: Bucket
    public readonly distribution: Distribution
    public readonly applicationUrl: string

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            description:
                'Frontend hosting - S3 bucket and CloudFront distribution for React app',
        })

        // Create S3 bucket (matches serverless ui config)
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

        // Create WAF (matches serverless ui config)
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

        // Create HSTS function (matches serverless ui config exactly)
        const hstsFunction = new CloudFrontFunction(
            this,
            'HstsCloudfrontFunction',
            {
                functionName: `hsts-${this.stage}`,
                comment: 'This function adds headers to implement HSTS',
                code: FunctionCode.fromInline(`
function handler(event) {
  var response = event.response;
  var headers = response.headers;
  headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload'};
  return response;
}`),
                runtime: FunctionRuntime.JS_1_0,
                autoPublish: true,
            }
        )

        // Create CloudFront distribution (matches serverless ui config)
        this.distribution = new Distribution(this, 'CloudFrontDistribution', {
            comment: 'CloudFront Distro for the static website hosted in S3',
            defaultRootObject: 'index.html',
            httpVersion: HttpVersion.HTTP2,

            defaultBehavior: {
                origin: new S3Origin(this.bucket, {
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

            // Logging to same bucket (matches serverless)
            enableLogging: true,
            logBucket: this.bucket,
            logFilePrefix: `${this.stage}-ui-cloudfront-logs/`,
        })

        this.applicationUrl = `https://${this.distribution.distributionDomainName}`

        this.createOutputs()
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
            value: this.applicationUrl,
            exportName: this.exportName('CloudFrontEndpointUrl'),
            description: 'CloudFront URL for React app',
        })
    }
}
