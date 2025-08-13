import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';

/**
 * Props for S3ScriptUploader
 */
export interface S3ScriptUploaderProps {
  /**
   * The S3 bucket to upload scripts to
   */
  bucket: s3.IBucket;
  
  /**
   * The local directory containing scripts to upload
   */
  sourceDirectory: string;
  
  /**
   * The S3 key prefix for uploaded files
   */
  destinationKeyPrefix?: string;
}

/**
 * Uploads local scripts to an S3 bucket during deployment
 */
export class S3ScriptUploader extends Construct {
  constructor(scope: Construct, id: string, props: S3ScriptUploaderProps) {
    super(scope, id);

    // Deploy scripts to S3
    new s3deploy.BucketDeployment(this, 'ScriptDeployment', {
      sources: [s3deploy.Source.asset(props.sourceDirectory)],
      destinationBucket: props.bucket,
      destinationKeyPrefix: props.destinationKeyPrefix || 'files/',
      prune: false, // Don't delete existing files
      retainOnDelete: false
    });
  }
}
