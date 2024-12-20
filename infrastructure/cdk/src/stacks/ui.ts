import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import { Construct } from 'constructs'

interface UiStackProps extends cdk.StackProps {
    stage: string
}

export class UiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: UiStackProps) {
        super(scope, id, props)

        // S3 Bucket
        const bucket = new s3.CfnBucket(this, 'S3Bucket', {
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
        const oai = new cloudfront.CfnCloudFrontOriginAccessIdentity(
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
            bucket: bucket.ref,
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Action: 's3:GetObject',
                        Resource: cdk.Fn.sub('arn:aws:s3:::${S3Bucket}/*', {
                            S3Bucket: bucket.ref,
                        }),
                        Principal: {
                            CanonicalUser: cdk.Fn.getAtt(
                                oai.logicalId,
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
                            cdk.Fn.sub('${S3Bucket.Arn}', {
                                'S3Bucket.Arn': bucket.attrArn,
                            }),
                            cdk.Fn.sub('${S3Bucket.Arn}/*', {
                                'S3Bucket.Arn': bucket.attrArn,
                            }),
                        ],
                        Sid: 'DenyUnencryptedConnections',
                    },
                ],
            },
        })
    }
}
