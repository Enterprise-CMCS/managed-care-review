import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Duration, Size, CustomResource } from 'aws-cdk-lib';
import * as path from 'path';
import * as fs from 'fs';
import { createHash } from 'crypto';

export interface PostgresScriptsUploadProps {
  /**
   * The S3 bucket to upload scripts to
   */
  bucket: s3.IBucket;
  
  /**
   * Stage name
   */
  stage: string;
  
  /**
   * Path to the scripts directory
   */
  scriptsPath?: string;
  
  /**
   * Script files to upload
   */
  scriptFiles?: string[];
}

/**
 * Custom resource for uploading Postgres VM scripts with checksum verification
 * Replaces the serverless hook with CDK-native solution
 */
export class PostgresScriptsUpload extends Construct {
  public readonly uploadFunction: lambda.Function;
  public readonly customResource: CustomResource;
  
  constructor(scope: Construct, id: string, props: PostgresScriptsUploadProps) {
    super(scope, id);
    
    const scriptsPath = props.scriptsPath || path.join(__dirname, '../../../vm-scripts');
    const scriptFiles = props.scriptFiles || [
      'vm-startup.sh',
      'vm-shutdown.sh',
      'slack-notify.service',
      'authorized_keys'
    ];
    
    // Calculate hash of all scripts for change detection
    const scriptsHash = this.calculateScriptsHash(scriptsPath, scriptFiles);
    
    // Create the upload Lambda function with robust error handling
    this.uploadFunction = new lambda.Function(this, 'ScriptsUploadFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      description: `Upload Postgres VM scripts to S3 with checksum verification - ${props.stage}`,
      timeout: Duration.minutes(5),
      memorySize: 512,
      ephemeralStorageSize: Size.gibibytes(2),
      environment: {
        SCRIPTS_BUCKET: props.bucket.bucketName,
        STAGE: props.stage
      },
      code: lambda.Code.fromInline(this.getUploadLambdaCode()),
    });
    
    // Grant permissions to the Lambda
    props.bucket.grantReadWrite(this.uploadFunction);
    
    // Create the custom resource provider
    const provider = new cr.Provider(this, 'ScriptsUploadProvider', {
      onEventHandler: this.uploadFunction,
      logRetention: 7,
    });
    
    // Create the custom resource
    this.customResource = new CustomResource(this, 'ScriptsUploadResource', {
      serviceToken: provider.serviceToken,
      resourceType: 'Custom::PostgresScriptsUpload',
      properties: {
        BucketName: props.bucket.bucketName,
        SourceHash: scriptsHash,
        ScriptsPath: 'files/',
        Scripts: scriptFiles.map(file => ({
          key: `files/${file}`,
          path: path.join(scriptsPath, file),
          exists: fs.existsSync(path.join(scriptsPath, file))
        })),
        Timestamp: new Date().toISOString()
      }
    });
    
    // Read and embed script contents for the Lambda
    const scriptContents: Record<string, string> = {};
    scriptFiles.forEach(file => {
      const filePath = path.join(scriptsPath, file);
      if (fs.existsSync(filePath)) {
        scriptContents[file] = fs.readFileSync(filePath, 'utf-8');
      }
    });
    
    // Add inline policy to embed script contents
    this.uploadFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:PutObjectTagging', 's3:GetObjectTagging'],
      resources: [`${props.bucket.bucketArn}/*`]
    }));
    
    // Store script contents as environment variable (base64 encoded to handle special chars)
    this.uploadFunction.addEnvironment(
      'SCRIPT_CONTENTS', 
      Buffer.from(JSON.stringify(scriptContents)).toString('base64')
    );
  }
  
  /**
   * Calculate hash of all scripts for change detection
   */
  private calculateScriptsHash(scriptsPath: string, scriptFiles: string[]): string {
    const hash = createHash('sha256');
    
    scriptFiles.forEach(file => {
      const filePath = path.join(scriptsPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        hash.update(file);
        hash.update(content);
      }
    });
    
    return hash.digest('hex').substring(0, 16);
  }
  
  /**
   * Lambda function code for uploading scripts with checksum verification
   */
  private getUploadLambdaCode(): string {
    return `
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const crypto = require('crypto');

// CloudFormation response helper
async function sendResponse(event, context, responseStatus, responseData) {
  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: responseData.message || 'See CloudWatch logs',
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData
  });

  const https = require('https');
  const url = require('url');
  const parsedUrl = url.parse(event.ResponseURL);
  
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: 'PUT',
    headers: {
      'content-type': '',
      'content-length': responseBody.length
    }
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, resolve);
    request.on('error', reject);
    request.write(responseBody);
    request.end();
  });
}

// Retry upload with exponential backoff and checksum verification
async function uploadWithRetry(bucket, key, body, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Calculate MD5 checksum
      const md5Hash = crypto.createHash('md5').update(body).digest('base64');
      
      console.log(\`Attempt \${attempt}: Uploading \${key} with checksum \${md5Hash}\`);
      
      // Upload with Content-MD5 for integrity check
      const uploadParams = {
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentMD5: md5Hash,
        Metadata: {
          'upload-checksum': md5Hash,
          'upload-timestamp': new Date().toISOString(),
          'upload-stage': process.env.STAGE || 'unknown'
        }
      };
      
      await s3.putObject(uploadParams).promise();
      
      // Verify upload by fetching object metadata
      const headParams = { Bucket: bucket, Key: key };
      const headResult = await s3.headObject(headParams).promise();
      
      // S3 returns ETag as MD5 hash (in quotes) for non-multipart uploads
      const uploadedEtag = headResult.ETag.replace(/"/g, '');
      const calculatedMd5 = crypto.createHash('md5').update(body).digest('hex');
      
      if (uploadedEtag === calculatedMd5) {
        console.log(\`Successfully uploaded and verified \${key}\`);
        return { success: true, checksum: uploadedEtag };
      } else {
        throw new Error(\`Checksum mismatch: expected \${calculatedMd5}, got \${uploadedEtag}\`);
      }
      
    } catch (error) {
      console.error(\`Attempt \${attempt} failed for \${key}:\`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(\`Retrying in \${delay}ms...\`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Check if deployment is needed by comparing hashes
async function isDeploymentNeeded(bucket, sourceHash) {
  try {
    const metadataKey = '.deployment-metadata.json';
    const result = await s3.getObject({
      Bucket: bucket,
      Key: metadataKey
    }).promise();
    
    const metadata = JSON.parse(result.Body.toString());
    return metadata.hash !== sourceHash;
    
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      console.log('No previous deployment found, proceeding with upload');
      return true;
    }
    throw error;
  }
}

// Main handler
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const { RequestType, ResourceProperties } = event;
    const { BucketName, SourceHash, Scripts } = ResourceProperties;
    
    // Handle delete requests
    if (RequestType === 'Delete') {
      console.log('Delete requested, keeping scripts in S3');
      await sendResponse(event, context, 'SUCCESS', { 
        message: 'Scripts retained in S3' 
      });
      return;
    }
    
    // Check if deployment is needed
    const needsDeployment = await isDeploymentNeeded(BucketName, SourceHash);
    
    if (!needsDeployment && RequestType === 'Update') {
      console.log('No changes detected, skipping upload');
      await sendResponse(event, context, 'SUCCESS', { 
        message: 'No changes detected',
        skipped: true,
        hash: SourceHash
      });
      return;
    }
    
    // Get script contents from environment
    const scriptContents = JSON.parse(
      Buffer.from(process.env.SCRIPT_CONTENTS || '{}', 'base64').toString()
    );
    
    // Upload each script with verification
    const results = [];
    const uploadPromises = Scripts.map(async (script) => {
      const scriptName = script.key.split('/').pop();
      const content = scriptContents[scriptName];
      
      if (!content) {
        console.warn(\`No content found for \${scriptName}, skipping\`);
        return null;
      }
      
      const result = await uploadWithRetry(BucketName, script.key, Buffer.from(content));
      return {
        script: script.key,
        ...result
      };
    });
    
    const uploadResults = await Promise.all(uploadPromises);
    const successfulUploads = uploadResults.filter(r => r !== null);
    
    // Store deployment metadata
    const metadata = {
      hash: SourceHash,
      timestamp: new Date().toISOString(),
      stage: process.env.STAGE,
      scripts: successfulUploads,
      stackId: event.StackId
    };
    
    await s3.putObject({
      Bucket: BucketName,
      Key: '.deployment-metadata.json',
      Body: JSON.stringify(metadata, null, 2),
      ContentType: 'application/json'
    }).promise();
    
    console.log('All scripts uploaded successfully');
    await sendResponse(event, context, 'SUCCESS', {
      message: 'Scripts uploaded with verification',
      uploadedCount: successfulUploads.length,
      hash: SourceHash
    });
    
  } catch (error) {
    console.error('Upload failed:', error);
    await sendResponse(event, context, 'FAILED', {
      message: error.message.substring(0, 200) // CloudFormation limit
    });
  }
};
`;
  }
}