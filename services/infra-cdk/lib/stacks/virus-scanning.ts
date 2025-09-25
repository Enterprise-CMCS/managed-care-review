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

        // Enable GuardDuty detector with S3 protection
        const detector = new guardduty.CfnDetector(this, 'Detector', {
            enable: true,
            features: [
                {
                    name: 'S3_DATA_EVENTS',
                    status: 'ENABLED',
                },
            ],
        })

        // Create IAM role for malware protection
        const malwareProtectionRole = new iam.Role(
            this,
            'MalwareProtectionRole',
            {
                assumedBy: new iam.ServicePrincipal(
                    'malware-protection.guardduty.amazonaws.com'
                ),
                managedPolicies: [
                    iam.ManagedPolicy.fromAwsManagedPolicyName(
                        'AmazonGuardDutyMalwareProtectionServiceRole'
                    ),
                ],
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

        // Export GuardDuty detector ID for reference
        new CfnOutput(this, 'GuardDutyDetectorId', {
            value: detector.attrId,
            exportName: `${this.stackName}-DetectorId`,
        })

        new CfnOutput(this, 'ScanProcessorFunctionName', {
            value: scanProcessor.functionName,
            exportName: `${this.stackName}-ScanProcessorFunctionName`,
        })
    }
}
