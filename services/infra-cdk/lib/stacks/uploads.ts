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
import { ResourceNames } from '../config/shared'
import { BROWSER_S3_OBJECT_ACTIONS } from '../constructs/storage/browser-s3-permissions'

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

        // Resource-policy denies also cover imported dev/Val/Prod identity
        // roles, whose legacy grants are managed outside this CDK stack.
        this.addUploadIntegrityPolicies(uploadsBucketInstance)
        this.addUploadIntegrityPolicies(qaBucketInstance)

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

    private getScannerRoleArn(): string {
        // Same deterministic name as VirusScanning; no cross-stack import or
        // deployment-order dependency on the scanner or Cognito stacks.
        return this.formatArn({
            service: 'iam',
            region: '',
            resource: 'role',
            resourceName: ResourceNames.guardDutyMalwareProtectionRoleName(
                this.stage
            ),
        })
    }

    private addUploadIntegrityPolicies(bucket: IBucket): void {
        // Select Cognito-issued role sessions with AWS's global IdP key, not
        // a provider-specific claim as a direct S3 Condition key. This avoids
        // role/session-name assumptions in enhanced and classic Identity Pool
        // flows. The retained identity ID still scopes private paths below.
        // https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-federatedprovider
        const browserSession = {
            'aws:FederatedProvider': 'cognito-identity.amazonaws.com',
        }
        const objects = [`${bucket.bucketArn}/*`]

        bucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'DenyBrowserObjectManagement',
                effect: Effect.DENY,
                principals: [new AnyPrincipal()],
                notActions: [...BROWSER_S3_OBJECT_ACTIONS],
                resources: objects,
                conditions: { StringEquals: browserSession },
            })
        )
        bucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'DenyBrowserUploadsOutsideApprovedPrefixes',
                effect: Effect.DENY,
                principals: [new AnyPrincipal()],
                actions: ['s3:PutObject'],
                notResources: [
                    `${bucket.bucketArn}/allusers/*`,
                    `${bucket.bucketArn}/private/\${cognito-identity.amazonaws.com:sub}/*`,
                ],
                conditions: { StringEquals: browserSession },
            })
        )
        bucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'DenyBrowserObjectCopies',
                effect: Effect.DENY,
                principals: [new AnyPrincipal()],
                actions: ['s3:PutObject'],
                resources: objects,
                conditions: {
                    StringEquals: browserSession,
                    Null: { 's3:x-amz-copy-source': 'false' },
                },
            })
        )
        bucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'DenyUnconditionalDocumentUploads',
                effect: Effect.DENY,
                principals: [new AnyPrincipal()],
                actions: ['s3:PutObject'],
                // Apply to presigned API uploads too, not just Cognito sessions.
                // Deterministic backend ZIPs live outside these namespaces.
                resources: [
                    `${bucket.bucketArn}/allusers/*`,
                    `${bucket.bucketArn}/private/*`,
                ],
                conditions: {
                    // Initiation and parts cannot carry the precondition;
                    // PutObject and CompleteMultipartUpload must both carry it.
                    Bool: { 's3:ObjectCreationOperation': 'true' },
                    StringNotEquals: { 's3:if-none-match': '*' },
                },
            })
        )
        // PutObjectTagging replaces the whole tag set, so filtering only the
        // requested tag key would allow its removal via an empty replacement.
        bucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'OnlyScannerCanChangeObjectTags',
                effect: Effect.DENY,
                principals: [new AnyPrincipal()],
                actions: [
                    's3:PutObjectTagging',
                    's3:PutObjectVersionTagging',
                    's3:DeleteObjectTagging',
                    's3:DeleteObjectVersionTagging',
                ],
                resources: objects,
                conditions: {
                    ArnNotEquals: {
                        'aws:PrincipalArn': this.getScannerRoleArn(),
                    },
                },
            })
        )
        bucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'OnlyScannerCanSetInitialScanTags',
                effect: Effect.DENY,
                principals: [new AnyPrincipal()],
                actions: ['s3:PutObject'],
                resources: objects,
                conditions: {
                    'ForAnyValue:StringEquals': {
                        's3:RequestObjectTagKeys': [
                            'GuardDutyMalwareScanStatus',
                        ],
                    },
                    ArnNotEquals: {
                        'aws:PrincipalArn': this.getScannerRoleArn(),
                    },
                },
            })
        )
    }

    /**
     * Add file type restrictions matching serverless bucket policies
     * The scanner needs to create its extensionless validation object.
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
                conditions: {
                    ArnNotEquals: {
                        'aws:PrincipalArn': this.getScannerRoleArn(),
                    },
                },
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
     * Only the scanner can read objects before a clean verdict exists.
     */
    private addVirusScanDownloadBlockingPolicies(
        uploadsBucket: IBucket,
        qaBucket: IBucket
    ): void {
        // The scanner must be able to read unscanned documents.
        uploadsBucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'DenyInfectedFileAccess',
                effect: Effect.DENY,
                principals: [new AnyPrincipal()],
                actions: ['s3:GetObject', 's3:GetObjectVersion'],
                resources: [`${uploadsBucket.bucketArn}/*`],
                conditions: {
                    StringNotEquals: {
                        's3:ExistingObjectTag/GuardDutyMalwareScanStatus':
                            'NO_THREATS_FOUND',
                    },
                    ArnNotEquals: {
                        'aws:PrincipalArn': this.getScannerRoleArn(),
                    },
                },
            })
        )

        // Apply the same clean-scan gate to Q&A documents.
        qaBucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'DenyInfectedFileAccess',
                effect: Effect.DENY,
                principals: [new AnyPrincipal()],
                actions: ['s3:GetObject', 's3:GetObjectVersion'],
                resources: [`${qaBucket.bucketArn}/*`],
                conditions: {
                    StringNotEquals: {
                        's3:ExistingObjectTag/GuardDutyMalwareScanStatus':
                            'NO_THREATS_FOUND',
                    },
                    ArnNotEquals: {
                        'aws:PrincipalArn': this.getScannerRoleArn(),
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
