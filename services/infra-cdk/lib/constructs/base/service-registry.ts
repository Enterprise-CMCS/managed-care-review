import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { PARAMETER_STORE_PATHS, ResourceNames } from '@config/constants';

/**
 * Service Registry for managing cross-stack references via SSM Parameter Store.
 * This avoids CloudFormation exports and circular dependencies.
 */
export class ServiceRegistry {
  /**
   * Store a value in Parameter Store
   */
  static putValue(
    scope: Construct,
    category: string,
    key: string,
    value: string,
    stage: string,
    description?: string
  ): ssm.StringParameter {
    const parameterName = ResourceNames.ssmParameterName(category, key, stage);
    
    return new ssm.StringParameter(scope, `${category}${key}Parameter`, {
      parameterName,
      stringValue: value,
      description: description || `${category} ${key} for ${stage}`,
      tier: ssm.ParameterTier.STANDARD
    });
  }

  /**
   * Retrieve a value from Parameter Store
   */
  static getValue(
    scope: Construct,
    category: string,
    key: string,
    stage: string
  ): string {
    const parameterName = ResourceNames.ssmParameterName(category, key, stage);
    return ssm.StringParameter.valueForStringParameter(scope, parameterName);
  }

  /**
   * Store VPC ID
   */
  static putVpcId(scope: Construct, stage: string, vpcId: string): void {
    this.putValue(scope, 'vpc', 'id', vpcId, stage, 'VPC ID');
  }

  /**
   * Get VPC ID
   */
  static getVpcId(scope: Construct, stage: string): string {
    return this.getValue(scope, 'vpc', 'id', stage);
  }

  /**
   * Store API Gateway URL
   */
  static putApiUrl(scope: Construct, stage: string, url: string): void {
    this.putValue(scope, 'api', 'url', url, stage, 'API Gateway URL');
  }

  /**
   * Get API Gateway URL
   */
  static getApiUrl(scope: Construct, stage: string): string {
    return this.getValue(scope, 'api', 'url', stage);
  }

  /**
   * Store API Gateway ID
   */
  static putApiId(scope: Construct, stage: string, apiId: string): void {
    this.putValue(scope, 'api', 'id', apiId, stage, 'API Gateway ID');
  }

  /**
   * Get API Gateway ID
   */
  static getApiId(scope: Construct, stage: string): string {
    return this.getValue(scope, 'api', 'id', stage);
  }

  /**
   * Store Database Secret ARN
   */
  static putDatabaseSecretArn(scope: Construct, stage: string, arn: string): void {
    this.putValue(scope, 'database', 'secret-arn', arn, stage, 'Database Secret ARN');
  }

  /**
   * Get Database Secret ARN
   */
  static getDatabaseSecretArn(scope: Construct, stage: string): string {
    return this.getValue(scope, 'database', 'secret-arn', stage);
  }

  /**
   * Store Database Cluster ARN
   */
  static putDatabaseClusterArn(scope: Construct, stage: string, arn: string): void {
    this.putValue(scope, 'database', 'cluster-arn', arn, stage, 'Database Cluster ARN');
  }

  /**
   * Get Database Cluster ARN
   */
  static getDatabaseClusterArn(scope: Construct, stage: string): string {
    return this.getValue(scope, 'database', 'cluster-arn', stage);
  }

  /**
   * Store User Pool ID
   */
  static putUserPoolId(scope: Construct, stage: string, userPoolId: string): void {
    this.putValue(scope, 'auth', 'user-pool-id', userPoolId, stage, 'Cognito User Pool ID');
  }

  /**
   * Get User Pool ID
   */
  static getUserPoolId(scope: Construct, stage: string): string {
    return this.getValue(scope, 'auth', 'user-pool-id', stage);
  }

  /**
   * Store User Pool Client ID
   */
  static putUserPoolClientId(scope: Construct, stage: string, clientId: string): void {
    this.putValue(scope, 'auth', 'user-pool-client-id', clientId, stage, 'Cognito User Pool Client ID');
  }

  /**
   * Get User Pool Client ID
   */
  static getUserPoolClientId(scope: Construct, stage: string): string {
    return this.getValue(scope, 'auth', 'user-pool-client-id', stage);
  }

  /**
   * Store Identity Pool ID
   */
  static putIdentityPoolId(scope: Construct, stage: string, identityPoolId: string): void {
    this.putValue(scope, 'auth', 'identity-pool-id', identityPoolId, stage, 'Cognito Identity Pool ID');
  }

  /**
   * Get Identity Pool ID
   */
  static getIdentityPoolId(scope: Construct, stage: string): string {
    return this.getValue(scope, 'auth', 'identity-pool-id', stage);
  }

  /**
   * Store Lambda Function ARN
   */
  static putLambdaArn(scope: Construct, stage: string, functionName: string, arn: string): void {
    this.putValue(scope, 'lambda', `${functionName}-arn`, arn, stage, `Lambda ${functionName} ARN`);
  }

  /**
   * Get Lambda Function ARN
   */
  static getLambdaArn(scope: Construct, stage: string, functionName: string): string {
    return this.getValue(scope, 'lambda', `${functionName}-arn`, stage);
  }

  /**
   * Store S3 Bucket Name
   */
  static putS3BucketName(scope: Construct, stage: string, bucketType: string, bucketName: string): void {
    this.putValue(scope, 's3', `${bucketType}-name`, bucketName, stage, `S3 ${bucketType} bucket name`);
  }

  /**
   * Get S3 Bucket Name
   */
  static getS3BucketName(scope: Construct, stage: string, bucketType: string): string {
    return this.getValue(scope, 's3', `${bucketType}-name`, stage);
  }

  /**
   * Store CloudFront Distribution ID
   */
  static putCloudFrontDistributionId(scope: Construct, stage: string, distributionType: string, distributionId: string): void {
    this.putValue(scope, 'cloudfront', `${distributionType}-id`, distributionId, stage, `CloudFront ${distributionType} distribution ID`);
  }

  /**
   * Get CloudFront Distribution ID
   */
  static getCloudFrontDistributionId(scope: Construct, stage: string, distributionType: string): string {
    return this.getValue(scope, 'cloudfront', `${distributionType}-id`, stage);
  }

  /**
   * Store Layer Version ARN
   */
  static putLayerArn(scope: Construct, stage: string, layerName: string, arn: string): void {
    this.putValue(scope, 'lambda', `layer-${layerName}-arn`, arn, stage, `Lambda Layer ${layerName} ARN`);
  }

  /**
   * Get Layer Version ARN
   */
  static getLayerArn(scope: Construct, stage: string, layerName: string): string {
    return this.getValue(scope, 'lambda', `layer-${layerName}-arn`, stage);
  }
}
