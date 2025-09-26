import { BaseStack, type BaseStackProps } from '../constructs/base'
import { SecureS3Bucket } from '@constructs/storage'
import type { Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import { CfnOutput } from 'aws-cdk-lib'

export interface UploadsProps extends BaseStackProps {
    // Uploads is independent - just needs basic config
}

/**
 * Uploads stack that manages S3 buckets and file processing
 * Matches serverless uploads service pattern
 */
export class Uploads extends BaseStack {
    public readonly uploadsBucket: s3.IBucket
    public readonly qaBucket: s3.IBucket

    constructor(scope: Construct, id: string, props: UploadsProps) {
        super(scope, id, {
            ...props,
            serviceName: 'uploads',
            description:
                'Uploads stack for mc-review - S3 buckets and file processing',
        })

        // Create S3 buckets and assign to properties
        const buckets = this.createS3Buckets()
        this.uploadsBucket = buckets.uploadsBucket
        this.qaBucket = buckets.qaBucket
    }

    /**
     * Create S3 buckets with proper security configurations
     * Matches services/uploads/serverless.yml bucket setup
     */
    private createS3Buckets(): {
        uploadsBucket: s3.IBucket
        qaBucket: s3.IBucket
    } {
        // Create uploads bucket that matches serverless naming: uploads-${stage}-uploads-${account}
        const uploadsBucket = new SecureS3Bucket(this, 'UploadsBucket', {
            bucketName: 'uploads-documents',
            stage: this.stage,
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.DELETE,
                        s3.HttpMethods.HEAD,
                    ],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                    exposedHeaders: ['ETag'],
                    maxAge: 3000,
                },
            ],
        })
        const uploadsBucketInstance = uploadsBucket.bucket

        // Create Q&A bucket that matches serverless naming: uploads-${stage}-qa-${account}
        const qaBucket = new SecureS3Bucket(this, 'QaBucket', {
            bucketName: 'uploads-qa',
            stage: this.stage,
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.DELETE,
                        s3.HttpMethods.HEAD,
                    ],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                    exposedHeaders: ['ETag'],
                    maxAge: 3000,
                },
            ],
        })
        const qaBucketInstance = qaBucket.bucket

        // Add file type restrictions that match serverless policy
        this.addFileTypeRestrictions(uploadsBucketInstance)
        this.addFileTypeRestrictions(qaBucketInstance)

        // Add GuardDuty malware protection permissions
        this.addGuardDutyMalwareProtectionAccess(uploadsBucketInstance)
        this.addGuardDutyMalwareProtectionAccess(qaBucketInstance)

        // Create outputs
        this.createOutputs(uploadsBucketInstance, qaBucketInstance)

        return {
            uploadsBucket: uploadsBucketInstance,
            qaBucket: qaBucketInstance,
        }
    }

    /**
     * Add file type restrictions matching serverless bucket policies
     */
    private addFileTypeRestrictions(bucket: s3.IBucket): void {
        bucket.addToResourcePolicy(
            new iam.PolicyStatement({
                sid: 'DenyUnsupportedFileTypes',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: ['s3:PutObject'],
                notResources: [
                    `${bucket.bucketArn}/*.csv`,
                    `${bucket.bucketArn}/*.doc`,
                    `${bucket.bucketArn}/*.docx`,
                    `${bucket.bucketArn}/*.pdf`,
                    `${bucket.bucketArn}/*.txt`,
                    `${bucket.bucketArn}/*.xls`,
                    `${bucket.bucketArn}/*.xlsx`,
                    `${bucket.bucketArn}/*.zip`,
                    `${bucket.bucketArn}/*.xlsm`,
                    `${bucket.bucketArn}/*.xltm`,
                    `${bucket.bucketArn}/*.xlam`,
                ],
            })
        )
    }

    /**
     * Add GuardDuty malware protection service access to bucket
     * This allows GuardDuty to scan objects and validate bucket ownership
     */
    private addGuardDutyMalwareProtectionAccess(bucket: s3.IBucket): void {
        bucket.addToResourcePolicy(
            new iam.PolicyStatement({
                sid: 'AllowGuardDutyMalwareProtection',
                effect: iam.Effect.ALLOW,
                principals: [
                    new iam.ServicePrincipal(
                        'malware-protection.guardduty.amazonaws.com'
                    ),
                ],
                actions: ['s3:*'],
                resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
            })
        )
    }

    /**
     * Create stack outputs that match serverless outputs
     */
    private createOutputs(
        uploadsBucket: s3.IBucket,
        qaBucket: s3.IBucket
    ): void {
        new CfnOutput(this, 'DocumentUploadsBucketName', {
            value: uploadsBucket.bucketName,
            description: 'Document uploads S3 bucket name',
            exportName: this.exportName('DocumentUploadsBucketName'),
        })

        new CfnOutput(this, 'DocumentUploadsBucketArn', {
            value: uploadsBucket.bucketArn,
            description: 'Document uploads S3 bucket ARN',
            exportName: this.exportName('DocumentUploadsBucketArn'),
        })

        new CfnOutput(this, 'QAUploadsBucketName', {
            value: qaBucket.bucketName,
            description: 'QA uploads S3 bucket name',
            exportName: this.exportName('QAUploadsBucketName'),
        })

        new CfnOutput(this, 'QAUploadsBucketArn', {
            value: qaBucket.bucketArn,
            description: 'QA uploads S3 bucket ARN',
            exportName: this.exportName('QAUploadsBucketArn'),
        })
    }
}
