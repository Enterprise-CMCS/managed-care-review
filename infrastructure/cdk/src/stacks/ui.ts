import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as wafv2 from 'aws-cdk-lib/aws-wafv2'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import { Construct } from 'constructs'

export class UiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)
    }
}

interface UiStackProps extends cdk.StackProps {
    stage: string
}

// Helper functions for CloudFormation conditions
function getAliases(condition: cdk.CfnCondition, domainName: string): string[] {
    return cdk.Token.asList(
        cdk.Fn.conditionIf(condition.logicalId, [domainName], [])
    )
}

function getViewerCertificateConfig(
    condition: cdk.CfnCondition,
    certificateArn: string
): cloudfront.CfnDistribution.ViewerCertificateProperty {
    // Type assertion needed: CloudFormation condition resolution happens at runtime
    return cdk.Fn.conditionIf(
        condition.logicalId,
        {
            acmCertificateArn: certificateArn,
            minimumProtocolVersion: 'TLSv1',
            sslSupportMethod: 'sni-only',
        },
        { cloudFrontDefaultCertificate: true }
    ) as cloudfront.CfnDistribution.ViewerCertificateProperty
}

/*
function getCloudFrontEndpointUrl(
    condition: cdk.CfnCondition,
    domainName: string,
    distribution: cloudfront.CfnDistribution
): string {
    return cdk.Token.asString(
        cdk.Fn.conditionIf(
            condition.logicalId,
            `https://${domainName}/`,
            cdk.Fn.sub('https://${DomainName}', {
                DomainName: distribution.attrDomainName,
            })
        )
    )
}

export class UiStack extends cdk.Stack {
    private readonly webAcl: wafv2.CfnWebACL
    private readonly bucket: s3.CfnBucket
    private readonly oai: cloudfront.CfnCloudFrontOriginAccessIdentity
    private readonly hstsFunction: cloudfront.CfnFunction
    private readonly distribution: cloudfront.CfnDistribution

    constructor(scope: Construct, id: string, props: UiStackProps) {
        super(scope, id, props)

        // S3 Bucket
        this.bucket = new s3.CfnBucket(this, 'S3Bucket', {
            websiteConfiguration: {
                indexDocument: 'index.html',
                errorDocument: 'index.html',
            },
            bucketEncryption: {
                serverSideEncryptionConfiguration: [
                    {
                        serverSideEncryptionByDefault: {
                            sseAlgorithm: 'AES256',
                        },
                    },
                ],
            },
            ownershipControls: {
                rules: [
                    {
                        objectOwnership: 'ObjectWriter',
                    },
                ],
            },
        })

        // CloudFront Origin Access Identity
        this.oai = new cloudfront.CfnCloudFrontOriginAccessIdentity(
            this,
            'CloudFrontOriginAccessIdentity',
            {
                cloudFrontOriginAccessIdentityConfig: {
                    comment:
                        'OAI to prevent direct public access to the bucket',
                },
            }
        )

        // Bucket Policy
        new s3.CfnBucketPolicy(this, 'BucketPolicy', {
            bucket: this.bucket.ref,
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Action: 's3:GetObject',
                        Resource: cdk.Fn.sub('arn:aws:s3:::${S3Bucket}/*', {
                            S3Bucket: this.bucket.ref,
                        }),
                        Principal: {
                            CanonicalUser: cdk.Fn.getAtt(
                                this.oai.logicalId,
                                'S3CanonicalUserId'
                            ).toString(),
                        },
                    },
                    {
                        Effect: 'Deny',
                        Action: 's3:*',
                        Principal: '*',
                        Condition: {
                            Bool: {
                                'aws:SecureTransport': false,
                            },
                        },
                        Resource: [
                            this.bucket.attrArn,
                            `${this.bucket.attrArn}/*`,
                        ],
                        Sid: 'DenyUnencryptedConnections',
                    },
                ],
            },
        })

        // WAF WebACL
        this.webAcl = new wafv2.CfnWebACL(this, 'CloudFrontWebAcl', {
            defaultAction: {
                block: {},
            },
            rules: [
                {
                    action: {
                        allow: {},
                    },
                    name: `${props.stage}-allow-usa-plus-territories`,
                    priority: 0,
                    statement: {
                        geoMatchStatement: {
                            countryCodes: [
                                'GU', // Guam
                                'PR', // Puerto Rico
                                'US', // USA
                                'UM', // US Minor Outlying Islands
                                'VI', // US Virgin Islands
                                'MP', // Northern Mariana Islands
                            ],
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'WafWebAcl',
                    },
                },
            ],
            scope: 'CLOUDFRONT',
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                sampledRequestsEnabled: true,
                metricName: `${props.stage}-webacl`,
            },
        })

        // HSTS CloudFront Function
        this.hstsFunction = new cloudfront.CfnFunction(
            this,
            'HstsCloudfrontFunction',
            {
                autoPublish: true,
                functionCode: `
        function handler(event) {
          var response = event.response;
          var headers = response.headers;
          headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload'};
          return response;
        }
      `,
                functionConfig: {
                    comment: 'This function adds headers to implement HSTS',
                    runtime: 'cloudfront-js-1.0',
                },
                name: `hsts-${props.stage}`,
            }
        )

        // Get SSM Parameters
        const cloudfrontDomainName = ssm.StringParameter.valueFromLookup(
            this,
            `/configuration/${props.stage}/cloudfront/domain_name`,
            ''
        )

        const cloudfrontCertificateArn = ssm.StringParameter.valueFromLookup(
            this,
            `/configuration/${props.stage}/cloudfront/certificate_arn`,
            ''
        )

        // Create custom domain condition
        const customDomainCondition = new cdk.CfnCondition(
            this,
            'CreateCustomCloudFrontDomain',
            {
                expression: cdk.Fn.conditionAnd(
                    cdk.Fn.conditionNot(
                        cdk.Fn.conditionEquals('', cloudfrontCertificateArn)
                    ),
                    cdk.Fn.conditionNot(
                        cdk.Fn.conditionEquals('', cloudfrontDomainName)
                    )
                ),
            }
        )

        // CloudFront Distribution
        this.distribution = new cloudfront.CfnDistribution(
            this,
            'CloudFrontDistribution',
            {
                distributionConfig: {
                    comment:
                        'CloudFront Distro for the static website hosted in S3',
                    aliases: getAliases(
                        customDomainCondition,
                        cloudfrontDomainName
                    ),
                    origins: [
                        {
                            domainName: this.bucket.attrDomainName,
                            id: 'S3Origin',
                            s3OriginConfig: {
                                originAccessIdentity: cdk.Fn.sub(
                                    'origin-access-identity/cloudfront/${CloudFrontOriginAccessIdentity}',
                                    {
                                        CloudFrontOriginAccessIdentity:
                                            this.oai.ref,
                                    }
                                ),
                            },
                        },
                    ],
                    enabled: true,
                    httpVersion: 'http2',
                    defaultRootObject: 'index.html',
                    defaultCacheBehavior: {
                        allowedMethods: ['GET', 'HEAD'],
                        compress: true,
                        targetOriginId: 'S3Origin',
                        forwardedValues: {
                            queryString: true,
                            cookies: { forward: 'none' },
                        },
                        viewerProtocolPolicy: 'redirect-to-https',
                        functionAssociations: [
                            {
                                eventType: 'viewer-response',
                                functionArn: cdk.Token.asString(
                                    cdk.Fn.getAtt(
                                        this.hstsFunction.logicalId,
                                        'FunctionMetadata.FunctionArn'
                                    )
                                ),
                            },
                        ],
                    },
                    viewerCertificate: getViewerCertificateConfig(
                        customDomainCondition,
                        cloudfrontCertificateArn
                    ),
                    customErrorResponses: [
                        {
                            errorCode: 403,
                            responseCode: 200,
                            responsePagePath: '/index.html',
                        },
                    ],
                    webAclId: this.webAcl.attrArn,
                    logging: {
                        bucket: this.bucket.attrDomainName,
                        prefix: `${props.stage}-ui-cloudfront-logs/`,
                    },
                },
            }
        )

        // CF Outputs
        new cdk.CfnOutput(this, 'S3BucketName', {
            value: this.bucket.ref,
        })

        new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
            value: this.distribution.ref,
        })

        new cdk.CfnOutput(this, 'CloudFrontEndpointUrl', {
            value: getCloudFrontEndpointUrl(
                customDomainCondition,
                cloudfrontDomainName,
                this.distribution
            ),
        })
    }
}
*/
