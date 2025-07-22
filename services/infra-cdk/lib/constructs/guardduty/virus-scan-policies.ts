/**
 * Virus Scan Bucket Policies
 * 
 * Adds security policies to S3 buckets to enforce virus scanning
 */

import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { S3_DEFAULTS } from '@config/constants';

export interface VirusScanPoliciesProps {
  bucket: s3.IBucket;
  bucketName: string;
  lambdaExecutionRoleArn?: string;
  allowedFileExtensions?: string[];
}

export class VirusScanPolicies extends Construct {
  constructor(scope: Construct, id: string, props: VirusScanPoliciesProps) {
    super(scope, id);

    const allowedExtensions = props.allowedFileExtensions || [...S3_DEFAULTS.ALLOWED_FILE_EXTENSIONS];
    const lambdaRoleArn = props.lambdaExecutionRoleArn || '*';

    // Policy 1: Deny GetObject unless file is clean
    this.addDenyUnscannedFileAccessPolicy(props.bucket, lambdaRoleArn);

    // Policy 2: Restrict file types
    this.addFileTypeRestrictionPolicy(props.bucket, allowedExtensions);

    // Policy 3: Enforce SSL
    this.addSslEnforcementPolicy(props.bucket);
  }

  /**
   * Deny access to unscanned files
   * Files must have virusScanStatus=CLEAN OR contentsPreviouslyScanned=TRUE
   * OR be accessed by the Lambda execution role
   */
  private addDenyUnscannedFileAccessPolicy(bucket: s3.IBucket, lambdaRoleArn: string): void {
    const policy = new iam.PolicyStatement({
      sid: `DenyUnscannedFileAccess${bucket.node.id}`,
      effect: iam.Effect.DENY,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:GetObject'],
      resources: [`${bucket.bucketArn}/*`]
    });

    // Add conditions - must match serverless implementation logic (AND logic)
    policy.addCondition('StringNotEquals', {
      's3:ExistingObjectTag/virusScanStatus': ['CLEAN'],
      's3:ExistingObjectTag/contentsPreviouslyScanned': ['TRUE'],
      'aws:PrincipalArn': lambdaRoleArn
    });

    bucket.addToResourcePolicy(policy);
  }

  /**
   * Restrict uploads to allowed file types only
   */
  private addFileTypeRestrictionPolicy(bucket: s3.IBucket, allowedExtensions: string[]): void {
    const policy = new iam.PolicyStatement({
      sid: `DenyNonAllowedFileTypes${bucket.node.id}`,
      effect: iam.Effect.DENY,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:PutObject'],
      notResources: allowedExtensions.map(ext => `${bucket.bucketArn}/${ext}`)
    });

    bucket.addToResourcePolicy(policy);
  }

  /**
   * Enforce SSL for all S3 operations
   */
  private addSslEnforcementPolicy(bucket: s3.IBucket): void {
    const policy = new iam.PolicyStatement({
      sid: `DenyUnencryptedConnections${bucket.node.id}`,
      effect: iam.Effect.DENY,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:*'],
      resources: [
        bucket.bucketArn,
        `${bucket.bucketArn}/*`
      ],
      conditions: {
        Bool: {
          'aws:SecureTransport': 'false'
        }
      }
    });

    bucket.addToResourcePolicy(policy);
  }

  /**
   * Add cross-account access policy for database exports
   */
  static addCrossAccountPolicy(
    bucket: s3.IBucket,
    crossAccountRole: iam.IRole
  ): void {
    bucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowCrossAccountAccess',
      effect: iam.Effect.ALLOW,
      principals: [crossAccountRole],
      actions: ['s3:PutObject', 's3:PutObjectAcl'],
      resources: [`${bucket.bucketArn}/*`]
    }));
  }
}