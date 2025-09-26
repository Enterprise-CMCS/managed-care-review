import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import type { Construct } from 'constructs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda'
import { Duration, CfnOutput } from 'aws-cdk-lib'
import {
    CfnMalwareProtectionPlan,
    type CfnDetector,
} from 'aws-cdk-lib/aws-guardduty'
import { Rule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import {
    Role,
    ServicePrincipal,
    PolicyDocument,
    PolicyStatement,
    Effect,
} from 'aws-cdk-lib/aws-iam'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import * as path from 'path'

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

        // Import the uploads buckets from the uploads stack
        const uploadsBucket = Bucket.fromBucketName(
            this,
            'ImportedUploadsBucket',
            `mcr-cdk-${this.stage}-uploads-documents-bucket`
        )

        const qaBucket = Bucket.fromBucketName(
            this,
            'ImportedQaBucket',
            `mcr-cdk-${this.stage}-uploads-qa-bucket`
        )

        // We don't create the detector - it's managed externally
        // We just reference it by ID for malware protection plans
        const detector = {
            attrId: detectorId,
        } as CfnDetector

        // Create IAM role for malware protection
        const malwareProtectionRole = new Role(this, 'MalwareProtectionRole', {
            assumedBy: new ServicePrincipal(
                'malware-protection.guardduty.amazonaws.com'
            ),
            inlinePolicies: {
                S3ScanPolicy: new PolicyDocument({
                    statements: [
                        // Bucket-level permissions for ownership validation and setup
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: [
                                's3:GetBucketAcl',
                                's3:GetBucketLocation',
                                's3:GetBucketNotification',
                                's3:GetObject',
                                's3:GetObjectAttributes',
                                's3:GetObjectVersion',
                                's3:ListBucket',
                            ],
                            resources: [
                                uploadsBucket.bucketArn,
                                qaBucket.bucketArn,
                                `${uploadsBucket.bucketArn}/*`,
                                `${qaBucket.bucketArn}/*`,
                            ],
                        }),
                        // Object-level permissions for scan results and artifacts
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: [
                                's3:GetObjectTagging',
                                's3:GetObjectVersionTagging',
                                's3:PutObject',
                                's3:PutObjectTagging',
                                's3:PutObjectVersionTagging',
                            ],
                            resources: [
                                `${uploadsBucket.bucketArn}/*`,
                                `${qaBucket.bucketArn}/*`,
                            ],
                        }),
                        // KMS permissions for encrypted buckets
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
                        // Bucket notification permissions for scan triggers
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['s3:PutBucketNotification'],
                            resources: [
                                uploadsBucket.bucketArn,
                                qaBucket.bucketArn,
                            ],
                        }),
                        // EventBridge permissions for scan result processing (managed rules)
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: [
                                'events:PutRule',
                                'events:DeleteRule',
                                'events:PutTargets',
                                'events:RemoveTargets',
                            ],
                            resources: [
                                `arn:aws:events:*:${this.account}:rule/DO-NOT-DELETE-AmazonGuardDutyMalwareProtectionS3*`,
                            ],
                            conditions: {
                                StringLike: {
                                    'events:ManagedBy':
                                        'malware-protection-plan.guardduty.amazonaws.com',
                                },
                            },
                        }),
                        // EventBridge monitoring permissions
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: [
                                'events:DescribeRule',
                                'events:ListTargetsByRule',
                            ],
                            resources: [
                                `arn:aws:events:*:${this.account}:rule/DO-NOT-DELETE-AmazonGuardDutyMalwareProtectionS3*`,
                            ],
                        }),
                    ],
                }),
            },
        })

        // Create malware protection plan for uploads bucket (with dependency)
        const uploadsProtectionPlan = new CfnMalwareProtectionPlan(
            this,
            'UploadsProtection',
            {
                role: malwareProtectionRole.roleArn,
                protectedResource: {
                    s3Bucket: {
                        bucketName: uploadsBucket.bucketName,
                        objectPrefixes: ['*'],
                    },
                },
                actions: {
                    tagging: {
                        status: 'ENABLED',
                    },
                },
            }
        )

        // Ensure IAM role is fully created before malware protection plan
        uploadsProtectionPlan.node.addDependency(malwareProtectionRole)

        // Create malware protection plan for QA bucket (with dependency)
        const qaProtectionPlan = new CfnMalwareProtectionPlan(
            this,
            'QaProtection',
            {
                role: malwareProtectionRole.roleArn,
                protectedResource: {
                    s3Bucket: {
                        bucketName: qaBucket.bucketName,
                        objectPrefixes: ['*'],
                    },
                },
                actions: {
                    tagging: {
                        status: 'ENABLED',
                    },
                },
            }
        )

        // Ensure IAM role is fully created before malware protection plan
        qaProtectionPlan.node.addDependency(malwareProtectionRole)

        // Create Lambda function to process GuardDuty scan results
        const scanProcessor = new NodejsFunction(this, 'ScanProcessor', {
            functionName: `virus-scanning-${this.stage}-scan-processor`,
            runtime: Runtime.NODEJS_20_X,
            architecture: Architecture.X86_64,
            handler: 'handler',
            entry: path.join(
                __dirname,
                '..',
                '..',
                '..',
                'uploads',
                'src',
                'lambdas',
                'guardDutyScanProcessor.ts'
            ),
            timeout: Duration.seconds(60),
            memorySize: 256,
            environment: {
                STAGE: this.stage,
            },
        })

        // Grant Lambda permissions to tag S3 objects
        scanProcessor.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:GetObjectTagging', 's3:PutObjectTagging'],
                resources: [
                    `${uploadsBucket.bucketArn}/*`,
                    `${qaBucket.bucketArn}/*`,
                ],
            })
        )

        // EventBridge rule to process GuardDuty scan results
        new Rule(this, 'ScanResultsRule', {
            eventPattern: {
                source: ['aws.guardduty'],
                detailType: ['GuardDuty Malware Scan'],
                detail: {
                    'scan-status': ['COMPLETED', 'FAILED', 'SKIPPED'],
                },
            },
            targets: [new LambdaFunction(scanProcessor)],
        })

        // Export GuardDuty detector ID for reference (imported from existing detector)
        new CfnOutput(this, 'GuardDutyDetectorId', {
            value: detector.attrId,
            exportName: `${this.stackName}-DetectorId`,
            description: 'GuardDuty detector ID (managed by corporate IT)',
        })

        new CfnOutput(this, 'ScanProcessorFunctionName', {
            value: scanProcessor.functionName,
            exportName: `${this.stackName}-ScanProcessorFunctionName`,
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
