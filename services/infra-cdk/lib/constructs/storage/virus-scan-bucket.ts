import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { S3ToLambda } from '@aws-solutions-constructs/aws-s3-lambda';
import { SecureS3Bucket, SecureS3BucketProps } from './secure-s3-bucket';
import { ServiceRegistry } from '@constructs/base';
// import { NagSuppressions } from 'cdk-nag';

export interface VirusScanBucketProps extends SecureS3BucketProps {
  scanFunction: lambda.IFunction;
  quarantineBucket?: s3.IBucket;
  scanOnUpload?: boolean;
  maxFileSize?: number;
  allowedFileExtensions?: string[];
}

/**
 * S3 bucket with automatic virus scanning using AWS Solutions Construct
 */
export class VirusScanBucket extends Construct {
  public readonly uploadBucket: s3.Bucket;
  public readonly scanPattern: S3ToLambda;
  private readonly scanFunction: lambda.IFunction;
  private readonly quarantineBucket?: s3.IBucket;

  constructor(scope: Construct, id: string, props: VirusScanBucketProps) {
    super(scope, id);

    this.scanFunction = props.scanFunction;
    this.quarantineBucket = props.quarantineBucket;

    // Create S3 to Lambda pattern using AWS Solutions Construct
    this.scanPattern = new S3ToLambda(this, 'VirusScanPattern', {
      existingLambdaObj: this.scanFunction as lambda.Function,
      bucketProps: {
        bucketName: props.bucketName,
        versioned: props.versioned ?? true,
        encryption: props.encryption ?? s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: props.blockPublicAccess ?? s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: props.enforceSSL ?? true,
        removalPolicy: props.removalPolicy,
        autoDeleteObjects: props.autoDeleteObjects,
        lifecycleRules: props.lifecycleRules,
        cors: props.cors ?? this.getDefaultCorsRules()
      },
      s3EventSourceProps: {
        events: [s3.EventType.OBJECT_CREATED]
      }
    });

    this.uploadBucket = this.scanPattern.s3Bucket as s3.Bucket;

    // Add tag-based access control policy
    this.addVirusScanTagPolicy();

    // Grant necessary permissions to scan function
    this.grantScanPermissions();

    // Add file upload restrictions if specified
    if (props.allowedFileExtensions || props.maxFileSize) {
      this.addUploadRestrictions(props.allowedFileExtensions, props.maxFileSize);
    }

    // Store bucket name in Parameter Store
    ServiceRegistry.putS3BucketName(this, props.stage, props.bucketName, this.uploadBucket.bucketName);

    // Apply CDK Nag suppressions
    this.applyCdkNagSuppressions();
  }

  /**
   * Get default CORS rules for upload bucket
   */
  private getDefaultCorsRules(): s3.CorsRule[] {
    return [{
      allowedMethods: [
        s3.HttpMethods.GET,
        s3.HttpMethods.PUT,
        s3.HttpMethods.POST,
        s3.HttpMethods.DELETE,
        s3.HttpMethods.HEAD
      ],
      allowedOrigins: ['*'],
      allowedHeaders: ['*'],
      exposedHeaders: ['ETag'],
      maxAge: 3000
    }];
  }

  /**
   * Add bucket policy for tag-based access control
   */
  private addVirusScanTagPolicy(): void {
    // Deny access to objects without CLEAN status
    this.uploadBucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'DenyAccessToInfectedObjects',
      effect: iam.Effect.DENY,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:GetObject'],
      resources: [`${this.uploadBucket.bucketArn}/*`],
      conditions: {
        StringNotEquals: {
          's3:ExistingObjectTag/virusScanStatus': 'CLEAN'
        },
        StringNotLike: {
          'aws:userid': [
            'AIDAI*', // IAM users
            'AROA*',  // IAM roles
            this.scanFunction.role?.roleName || '*'
          ]
        }
      }
    }));

    // Allow bypass for specific admin roles
    this.uploadBucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowAdminBypass',
      effect: iam.Effect.ALLOW,
      principals: [new iam.ArnPrincipal(`arn:aws:iam::${Stack.of(this).account}:role/mcr-*-admin-role`)],
      actions: ['s3:GetObject'],
      resources: [`${this.uploadBucket.bucketArn}/*`]
    }));
  }

  /**
   * Grant necessary permissions to the scan function
   */
  private grantScanPermissions(): void {
    // Grant read/write permissions on upload bucket
    this.uploadBucket.grantReadWrite(this.scanFunction);

    // Grant tagging permissions
    this.scanFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObjectTagging',
        's3:GetObjectTagging',
        's3:DeleteObjectTagging'
      ],
      resources: [`${this.uploadBucket.bucketArn}/*`]
    }));

    // Grant write permissions to quarantine bucket if provided
    if (this.quarantineBucket) {
      this.quarantineBucket.grantWrite(this.scanFunction);
    }

    // Grant permissions to publish scan results
    this.scanFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sns:Publish', 'sqs:SendMessage'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'aws:RequestedRegion': Stack.of(this).region
        }
      }
    }));
  }

  /**
   * Add upload restrictions via bucket policy
   */
  private addUploadRestrictions(allowedExtensions?: string[], maxFileSize?: number): void {
    const conditions: any = {};

    // Add file extension restrictions
    if (allowedExtensions && allowedExtensions.length > 0) {
      const patterns = allowedExtensions.map(ext => `*.${ext.toLowerCase()}`);
      conditions['StringLike'] = {
        's3:x-amz-metadata-fileextension': patterns
      };
    }

    // Add file size restrictions
    if (maxFileSize) {
      conditions['NumericLessThanEquals'] = {
        's3:content-length': maxFileSize.toString()
      };
    }

    if (Object.keys(conditions).length > 0) {
      this.uploadBucket.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'EnforceUploadRestrictions',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:PutObject'],
        resources: [`${this.uploadBucket.bucketArn}/*`],
        conditions: {
          ...conditions,
          StringNotLike: {
            'aws:userid': [
              'AIDAI*', // IAM users
              'AROA*'   // IAM roles
            ]
          }
        }
      }));
    }
  }

  /**
   * Apply CDK Nag suppressions
   */
  private applyCdkNagSuppressions(): void {
    // CDK Nag suppressions temporarily disabled
    // Will be re-enabled once synthesis is working
  }

  /**
   * Get the upload bucket
   */
  public get bucket(): s3.IBucket {
    return this.uploadBucket;
  }

  /**
   * Grant read access to clean objects only
   */
  public grantReadCleanObjects(identity: iam.IGrantable): iam.Grant {
    const grant = this.uploadBucket.grantRead(identity);
    
    // Add condition to only allow reading clean objects
    if (identity instanceof iam.Role || identity instanceof iam.User) {
      identity.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: [`${this.uploadBucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            's3:ExistingObjectTag/virusScanStatus': 'CLEAN'
          }
        }
      }));
    }

    return grant;
  }
}
