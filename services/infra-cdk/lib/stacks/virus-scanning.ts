import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import type { Construct } from 'constructs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda'
import { Duration } from 'aws-cdk-lib'
import * as guardduty from 'aws-cdk-lib/aws-guardduty'
import * as events from 'aws-cdk-lib/aws-events'
import * as targets from 'aws-cdk-lib/aws-events-targets'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as path from 'path'
import { CfnOutput } from 'aws-cdk-lib'

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

        // Import existing GuardDuty detector (managed by corporate IT)
        // All environments use the same detector, but create their own protection plans
        const detectorId = this.getExistingDetectorId()

        // We don't create the detector - it's managed externally
        // We just reference it by ID for malware protection plans
        const detector = {
            attrId: detectorId,
        } as guardduty.CfnDetector

        // Create IAM role for malware protection
        const malwareProtectionRole = new iam.Role(
            this,
            'MalwareProtectionRole',
            {
                assumedBy: new iam.ServicePrincipal(
                    'malware-protection.guardduty.amazonaws.com'
                ),
                inlinePolicies: {
                    MalwareProtectionPolicy: new iam.PolicyDocument({
                        statements: [
                            // S3 object permissions
                            new iam.PolicyStatement({
                                effect: iam.Effect.ALLOW,
                                actions: [
                                    's3:GetObject',
                                    's3:GetObjectTagging',
                                    's3:GetObjectVersion',
                                    's3:PutObject',
                                    's3:PutObjectAcl',
                                    's3:PutObjectTagging',
                                    's3:PutObjectVersionTagging',
                                    's3:DeleteObject',
                                ],
                                resources: [
                                    `arn:aws:s3:::uploads-${this.stage}-uploads-${this.account}/*`,
                                    `arn:aws:s3:::uploads-${this.stage}-qa-${this.account}/*`,
                                ],
                            }),
                            // S3 bucket permissions for ownership validation
                            new iam.PolicyStatement({
                                effect: iam.Effect.ALLOW,
                                actions: [
                                    's3:GetBucketLocation',
                                    's3:GetBucketVersioning',
                                    's3:ListBucket',
                                ],
                                resources: [
                                    `arn:aws:s3:::uploads-${this.stage}-uploads-${this.account}`,
                                    `arn:aws:s3:::uploads-${this.stage}-qa-${this.account}`,
                                ],
                            }),
                        ],
                    }),
                },
            }
        )

        // Create malware protection plan for uploads bucket
        new guardduty.CfnMalwareProtectionPlan(this, 'UploadsProtection', {
            role: malwareProtectionRole.roleArn,
            protectedResource: {
                s3Bucket: {
                    bucketName: `uploads-${this.stage}-uploads-${this.account}`,
                    objectPrefixes: ['*'],
                },
            },
            actions: {
                tagging: {
                    status: 'ENABLED',
                },
            },
        })

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
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['s3:GetObjectTagging', 's3:PutObjectTagging'],
                resources: [
                    `arn:aws:s3:::uploads-${this.stage}-uploads-${this.account}/*`,
                    `arn:aws:s3:::uploads-${this.stage}-qa-${this.account}/*`,
                ],
            })
        )

        // EventBridge rule to process GuardDuty scan results
        new events.Rule(this, 'ScanResultsRule', {
            eventPattern: {
                source: ['aws.guardduty'],
                detailType: ['GuardDuty Malware Scan'],
                detail: {
                    'scan-status': ['COMPLETED', 'FAILED', 'SKIPPED'],
                },
            },
            targets: [new targets.LambdaFunction(scanProcessor)],
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
