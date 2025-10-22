import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import type { Construct } from 'constructs'
import { CfnOutput, Fn } from 'aws-cdk-lib'
import {
    CfnMalwareProtectionPlan,
    type CfnDetector,
} from 'aws-cdk-lib/aws-guardduty'
import {
    Role,
    Policy,
    ServicePrincipal,
    PolicyDocument,
    PolicyStatement,
    Effect,
} from 'aws-cdk-lib/aws-iam'
import { Bucket } from 'aws-cdk-lib/aws-s3'

export interface VirusScanningProps extends BaseStackProps {
    // Simple - just needs basic config
}

/**
 * Simple GuardDuty malware protection for S3 uploads
 * Replaces ClamAV with AWS-managed virus scanning
 */
export class VirusScanning extends BaseStack {
    constructor(scope: Construct, id: string, props: VirusScanningProps) {
        super(scope, id, {
            ...props,
            serviceName: 'virus-scanning',
            description: 'GuardDuty malware protection for S3 uploads',
        })

        // Import existing GuardDuty detector
        // All environments use the same detector, but create their own protection plans
        const detectorId = this.getExistingDetectorId()

        // Import the uploads buckets from CloudFormation exports
        const uploadsStackName = `uploads-${this.stage}-cdk`

        const uploadsBucket = Bucket.fromBucketName(
            this,
            'ImportedUploadsBucket',
            Fn.importValue(`${uploadsStackName}-DocumentUploadsBucketName`)
        )

        const qaBucket = Bucket.fromBucketName(
            this,
            'ImportedQaBucket',
            Fn.importValue(`${uploadsStackName}-QAUploadsBucketName`)
        )

        // We don't create the detector - it's managed externally
        // We just reference it by ID for malware protection plans
        const detector = {
            attrId: detectorId,
        } as CfnDetector

        // Create IAM role for GuardDuty Malware Protection (following AWS sample)
        const guardDutyPassRole = new Role(
            this,
            'GuardDutyMalwareProtectionPassRole',
            {
                roleName: `GuardDutyMalwareProtectionPassRole-${this.stage}`,
                assumedBy: new ServicePrincipal(
                    'malware-protection-plan.guardduty.amazonaws.com'
                ), // Note: different from service-linked role!
                description:
                    'IAM pass role for GuardDuty malware protection service',
            }
        )

        // Create IAM policy with comprehensive permissions (AWS sample pattern)
        const rolePolicy = new Policy(
            this,
            'GuardDutyMalwareProtectionRolePolicy',
            {
                policyName: `GuardDutyMalwareProtectionRolePolicy-${this.stage}`,
                document: new PolicyDocument({
                    statements: [
                        // S3 permissions for scanning and tagging (using CloudFormation imports)
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['s3:*'],
                            resources: [
                                uploadsBucket.bucketArn,
                                qaBucket.bucketArn,
                                `${uploadsBucket.bucketArn}/*`,
                                `${qaBucket.bucketArn}/*`,
                            ],
                        }),
                        // EventBridge permissions
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: [
                                'events:PutRule',
                                'events:DeleteRule',
                                'events:PutTargets',
                                'events:RemoveTargets',
                                'events:DescribeRule',
                                'events:ListTargetsByRule',
                            ],
                            resources: [
                                `arn:aws:events:*:${this.account}:rule/DO-NOT-DELETE-AmazonGuardDutyMalwareProtectionS3*`,
                            ],
                        }),
                        // KMS permissions
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: [
                                'kms:Decrypt',
                                'kms:DescribeKey',
                                'kms:GenerateDataKey',
                            ],
                            resources: ['*'],
                            conditions: {
                                StringEquals: {
                                    'kms:ViaService': [
                                        `s3.${this.region}.amazonaws.com`,
                                    ],
                                },
                            },
                        }),
                    ],
                }),
            }
        )

        // Attach policy to role
        rolePolicy.attachToRole(guardDutyPassRole)

        // Ensure IAM policy can reference bucket ARNs (depends on bucket imports)
        rolePolicy.node.addDependency(uploadsBucket)
        rolePolicy.node.addDependency(qaBucket)

        // Create malware protection plan for uploads bucket (with proper dependencies)
        const uploadsProtectionPlan = new CfnMalwareProtectionPlan(
            this,
            'UploadsProtection',
            {
                role: guardDutyPassRole.roleArn,
                protectedResource: {
                    s3Bucket: {
                        bucketName: uploadsBucket.bucketName,
                    },
                },
                actions: {
                    tagging: {
                        status: 'ENABLED',
                    },
                },
            }
        )

        // Ensure malware protection plan is created after role and bucket are ready
        uploadsProtectionPlan.node.addDependency(guardDutyPassRole)
        uploadsProtectionPlan.node.addDependency(rolePolicy)
        uploadsProtectionPlan.node.addDependency(uploadsBucket)

        // Create malware protection plan for QA bucket (with proper dependencies)
        const qaProtectionPlan = new CfnMalwareProtectionPlan(
            this,
            'QaProtection',
            {
                role: guardDutyPassRole.roleArn,
                protectedResource: {
                    s3Bucket: {
                        bucketName: qaBucket.bucketName,
                    },
                },
                actions: {
                    tagging: {
                        status: 'ENABLED',
                    },
                },
            }
        )

        // Ensure malware protection plan is created after role and bucket are ready
        qaProtectionPlan.node.addDependency(guardDutyPassRole)
        qaProtectionPlan.node.addDependency(rolePolicy)
        qaProtectionPlan.node.addDependency(qaBucket)

        // Native GuardDuty tagging handles everything we need
        // No custom Lambda processing required

        // Export GuardDuty detector ID for reference (imported from existing detector)
        new CfnOutput(this, 'GuardDutyDetectorId', {
            value: detector.attrId,
            exportName: `${this.stackName}-DetectorId`,
            description: 'GuardDuty detector ID (managed by corporate IT)',
        })
    }

    /**
     * Get the existing GuardDuty detector ID (managed by corporate IT)
     * Can be overridden with context or environment variable
     */
    private getExistingDetectorId(): string {
        // Try context first (for flexibility in deployments)
        const contextDetectorId = this.node.tryGetContext(
            'guardduty-detector-id'
        )
        if (contextDetectorId) {
            return contextDetectorId
        }

        // Try environment variable
        const envDetectorId = process.env.GUARDDUTY_DETECTOR_ID
        if (envDetectorId) {
            return envDetectorId
        }

        // For now, we need to look up the detector ID
        // In a real deployment, you'd get this from corporate IT or AWS CLI
        // aws guardduty list-detectors --region us-east-1 --query 'DetectorIds[0]' --output text
        throw new Error(
            'GuardDuty detector ID not found. Please provide via context "--context guardduty-detector-id=<id>" or environment variable GUARDDUTY_DETECTOR_ID'
        )
    }
}
