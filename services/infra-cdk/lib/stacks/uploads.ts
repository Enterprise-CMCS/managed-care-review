import { BaseStack, type BaseStackProps } from '../constructs/base'
import { SecureS3Bucket } from '@constructs/storage'
import type { Construct } from 'constructs'
import { type IBucket, HttpMethods } from 'aws-cdk-lib/aws-s3'
import {
    PolicyStatement,
    Effect,
    AnyPrincipal,
    ServicePrincipal,
} from 'aws-cdk-lib/aws-iam'
import { CfnOutput } from 'aws-cdk-lib'

export interface UploadsProps extends BaseStackProps {
    // Uploads is independent - just needs basic config
}

/**
 * Uploads stack that manages S3 buckets and file processing
 * Matches serverless uploads service pattern
 */
export class Uploads extends BaseStack {
    public readonly uploadsBucket: IBucket
    public readonly qaBucket: IBucket

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
        uploadsBucket: IBucket
        qaBucket: IBucket
    } {
        // Create uploads bucket that matches serverless naming: uploads-${stage}-uploads-${account}
        const uploadsBucket = new SecureS3Bucket(this, 'UploadsBucket', {
            bucketName: 'uploads-documents',
            stage: this.stage,
            cors: [
                {
                    allowedMethods: [
                        HttpMethods.GET,
                        HttpMethods.PUT,
                        HttpMethods.POST,
                        HttpMethods.DELETE,
                        HttpMethods.HEAD,
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
                        HttpMethods.GET,
                        HttpMethods.PUT,
                        HttpMethods.POST,
                        HttpMethods.DELETE,
                        HttpMethods.HEAD,
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

        // Add virus scan download blocking policies
        this.addVirusScanDownloadBlockingPolicies(
            uploadsBucketInstance,
            qaBucketInstance
        )

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
    private addFileTypeRestrictions(bucket: IBucket): void {
        bucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'DenyUnsupportedFileTypes',
                effect: Effect.DENY,
                principals: [new AnyPrincipal()],
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
    private addGuardDutyMalwareProtectionAccess(bucket: IBucket): void {
        // Main GuardDuty malware protection permissions
        bucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'AllowGuardDutyMalwareProtection',
                effect: Effect.ALLOW,
                principals: [
                    new ServicePrincipal(
                        'malware-protection.guardduty.amazonaws.com'
                    ),
                ],
                actions: ['s3:*'],
                resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
            })
        )

        // Additional permissions for GuardDuty test object creation/validation
        bucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'AllowGuardDutyTestObjects',
                effect: Effect.ALLOW,
                principals: [
                    new ServicePrincipal(
                        'malware-protection-plan.guardduty.amazonaws.com'
                    ),
                ],
                actions: [
                    's3:PutObject',
                    's3:GetObject',
                    's3:DeleteObject',
                    's3:PutObjectTagging',
                    's3:GetObjectTagging',
                ],
                resources: [
                    `${bucket.bucketArn}/aws-guardduty-malware-protection-test-*`,
                    `${bucket.bucketArn}/malware-protection-resource-validation-object`,
                ],
            })
        )
    }

    /**
     * Add virus scan download blocking policies
     * Blocks downloads of files that don't have GuardDutyMalwareScanStatus=NO_THREATS_FOUND
     */
    private addVirusScanDownloadBlockingPolicies(
        uploadsBucket: IBucket,
        qaBucket: IBucket
    ): void {
        // Add deny policy to uploads bucket
        uploadsBucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'DenyInfectedFileAccess',
                effect: Effect.DENY,
                principals: [new AnyPrincipal()],
                actions: ['s3:GetObject'],
                resources: [`${uploadsBucket.bucketArn}/*`],
                conditions: {
                    StringNotEquals: {
                        's3:ExistingObjectTag/GuardDutyMalwareScanStatus':
                            'NO_THREATS_FOUND',
                    },
                },
            })
        )

        // Add deny policy to QA bucket
        qaBucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'DenyInfectedFileAccess',
                effect: Effect.DENY,
                principals: [new AnyPrincipal()],
                actions: ['s3:GetObject'],
                resources: [`${qaBucket.bucketArn}/*`],
                conditions: {
                    StringNotEquals: {
                        's3:ExistingObjectTag/GuardDutyMalwareScanStatus':
                            'NO_THREATS_FOUND',
                    },
                },
            })
        )
    }

    /**
     * Create stack outputs that match serverless outputs
     */
    private createOutputs(uploadsBucket: IBucket, qaBucket: IBucket): void {
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
