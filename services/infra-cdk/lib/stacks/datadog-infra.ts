import { BaseStack, type BaseStackProps } from '../constructs/base'
import { SecureS3Bucket } from '@constructs/storage'
import type { Construct } from 'constructs'
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib'

export class DatadogInfra extends BaseStack {
    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            serviceName: 'datadog-infra',
            description:
                'Datadog monitoring infrastructure - OpenTofu state storage',
        })

        // S3 bucket for OpenTofu state. Name resolves to datadog-tf-state-{stage}-bucket-cdk.
        // removalPolicy and autoDeleteObjects must stay explicit: SecureS3Bucket defaults to
        // DESTROY/true for non-prod stages, which would wipe the TF state on stack recreation.
        const tfStateBucket = new SecureS3Bucket(this, 'TfStateBucket', {
            bucketName: 'datadog-tf-state',
            stage: this.stage,
            removalPolicy: RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
        })

        new CfnOutput(this, 'TfStateBucketName', {
            value: tfStateBucket.bucketName,
            exportName: this.exportName('TfStateBucketName'),
        })
    }
}
