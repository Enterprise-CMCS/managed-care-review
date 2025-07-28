import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Stack } from 'aws-cdk-lib';
import { ServiceRegistry } from '@constructs/base';

export interface BuildConfiguration {
  // API Configuration
  VITE_APP_API_URL: string;
  VITE_APP_OTEL_COLLECTOR_URL: string;
  
  // Auth Configuration
  VITE_APP_AUTH_MODE: string;
  VITE_APP_COGNITO_REGION: string;
  VITE_APP_COGNITO_ID_POOL_ID: string;
  VITE_APP_COGNITO_USER_POOL_ID: string;
  VITE_APP_COGNITO_USER_POOL_CLIENT_ID: string;
  VITE_APP_COGNITO_USER_POOL_CLIENT_DOMAIN: string;
  
  // S3 Configuration
  VITE_APP_S3_REGION: string;
  VITE_APP_S3_DOCUMENTS_BUCKET: string;
  VITE_APP_S3_QA_BUCKET: string;
  
  // Application Configuration
  VITE_APP_APPLICATION_ENDPOINT: string;
  VITE_APP_STAGE_NAME: string;
  
  // Feature Flags & Monitoring (Optional)
  VITE_APP_LD_CLIENT_ID?: string;
  VITE_APP_NR_ACCOUNT_ID?: string;
  VITE_APP_NR_AGENT_ID?: string;
  VITE_APP_NR_LICENSE_KEY?: string;
  VITE_APP_NR_TRUST_KEY?: string;
}

export interface BuildConfigProps {
  /**
   * Stage name (dev, val, prod)
   */
  stage: string;
  
  /**
   * Auth mode for the application
   */
  authMode?: string;
  
  /**
   * Application endpoint URL (will be set after CloudFront is created)
   */
  applicationEndpoint?: string;
}

/**
 * Manages build-time configuration for frontend applications
 * Provides methods to retrieve configuration from various sources
 */
export class BuildConfig extends Construct {
  private readonly stage: string;
  
  constructor(scope: Construct, id: string, props: BuildConfigProps) {
    super(scope, id);
    this.stage = props.stage;
  }
  
  /**
   * Get build configuration from ServiceRegistry and SSM parameters
   * This matches the serverless app-web configuration pattern
   */
  public getConfiguration(applicationEndpoint: string): BuildConfiguration {
    // API Configuration
    const apiUrl = ServiceRegistry.getApiUrl(this, this.stage);
    
    // Auth Configuration
    const cognitoRegion = this.stack.region;
    const identityPoolId = ServiceRegistry.getIdentityPoolId(this, this.stage);
    const userPoolId = ServiceRegistry.getUserPoolId(this, this.stage);
    const userPoolClientId = ServiceRegistry.getUserPoolClientId(this, this.stage);
    
    // Construct user pool domain (matches serverless pattern)
    const userPoolDomain = `${this.stage}-login-${userPoolClientId}`;
    const userPoolClientDomain = `${userPoolDomain}.auth.${cognitoRegion}.amazoncognito.com`;
    
    // S3 Configuration
    const s3Region = this.stack.region;
    const documentsBucket = ServiceRegistry.getS3BucketName(this, this.stage, 'uploads');
    const qaBucket = ServiceRegistry.getS3BucketName(this, this.stage, 'qa-uploads');
    
    // Optional parameters from SSM
    const ldClientId = this.getOptionalSsmParameter('/configuration/react_app_ld_client_id_feds');
    const nrAccountId = this.getOptionalSsmParameter('/configuration/react_app_nr_account_id');
    const nrAgentId = this.getOptionalSsmParameter('/configuration/react_app_nr_agent_id');
    const nrLicenseKey = this.getOptionalSsmParameter('/configuration/react_app_nr_license_key');
    const nrTrustKey = this.getOptionalSsmParameter('/configuration/react_app_nr_trust_key');
    
    return {
      // API Configuration
      VITE_APP_API_URL: apiUrl,
      VITE_APP_OTEL_COLLECTOR_URL: `${apiUrl}/otel`,
      
      // Auth Configuration
      VITE_APP_AUTH_MODE: process.env.VITE_APP_AUTH_MODE || 'COGNITO',
      VITE_APP_COGNITO_REGION: cognitoRegion,
      VITE_APP_COGNITO_ID_POOL_ID: identityPoolId,
      VITE_APP_COGNITO_USER_POOL_ID: userPoolId,
      VITE_APP_COGNITO_USER_POOL_CLIENT_ID: userPoolClientId,
      VITE_APP_COGNITO_USER_POOL_CLIENT_DOMAIN: userPoolClientDomain,
      
      // S3 Configuration
      VITE_APP_S3_REGION: s3Region,
      VITE_APP_S3_DOCUMENTS_BUCKET: documentsBucket,
      VITE_APP_S3_QA_BUCKET: qaBucket,
      
      // Application Configuration
      VITE_APP_APPLICATION_ENDPOINT: applicationEndpoint,
      VITE_APP_STAGE_NAME: this.stage,
      
      // Optional Feature Flags & Monitoring
      VITE_APP_LD_CLIENT_ID: ldClientId,
      VITE_APP_NR_ACCOUNT_ID: nrAccountId,
      VITE_APP_NR_AGENT_ID: nrAgentId,
      VITE_APP_NR_LICENSE_KEY: nrLicenseKey,
      VITE_APP_NR_TRUST_KEY: nrTrustKey
    };
  }
  
  /**
   * Store build configuration in SSM for build processes
   */
  public storeConfiguration(config: BuildConfiguration): void {
    Object.entries(config).forEach(([key, value]) => {
      if (value !== undefined) {
        new ssm.StringParameter(this, `${key}Parameter`, {
          parameterName: `/mcr-cdk/${this.stage}/frontend/build/${key}`,
          stringValue: value,
          description: `Frontend build configuration: ${key}`
        });
      }
    });
  }
  
  /**
   * Store configuration metadata without resolving cross-stack references
   * This avoids circular dependencies during CDK synthesis
   */
  public storeConfigurationMetadata(applicationEndpoint: string): void {
    // Store the application endpoint directly
    new ssm.StringParameter(this, 'AppEndpointParameter', {
      parameterName: `/mcr-cdk/${this.stage}/frontend/build/metadata/app-endpoint`,
      stringValue: applicationEndpoint,
      description: 'Frontend application endpoint'
    });
    
    // Store references to where configuration values can be found
    // These will be resolved during the build process, not during CDK synthesis
    const configSources = {
      API_URL: `/mcr-cdk/${this.stage}/service-registry/api/url`,
      USER_POOL_ID: `/mcr-cdk/${this.stage}/service-registry/auth/user-pool-id`,
      USER_POOL_CLIENT_ID: `/mcr-cdk/${this.stage}/service-registry/auth/user-pool-client-id`,
      IDENTITY_POOL_ID: `/mcr-cdk/${this.stage}/service-registry/auth/identity-pool-id`,
      UPLOADS_BUCKET: `/mcr-cdk/${this.stage}/service-registry/s3/uploads-bucket-name`,
      QA_BUCKET: `/mcr-cdk/${this.stage}/service-registry/s3/qa-bucket-name`
    };
    
    // Store the configuration source paths
    Object.entries(configSources).forEach(([key, paramPath]) => {
      new ssm.StringParameter(this, `${key}SourceParameter`, {
        parameterName: `/mcr-cdk/${this.stage}/frontend/build/metadata/source/${key}`,
        stringValue: paramPath,
        description: `SSM parameter path for ${key}`
      });
    });
    
    // Store static configuration values
    new ssm.StringParameter(this, 'StageParameter', {
      parameterName: `/mcr-cdk/${this.stage}/frontend/build/metadata/stage`,
      stringValue: this.stage,
      description: 'Deployment stage'
    });
    
    new ssm.StringParameter(this, 'AuthModeParameter', {
      parameterName: `/mcr-cdk/${this.stage}/frontend/build/metadata/auth-mode`,
      stringValue: process.env.VITE_APP_AUTH_MODE || 'COGNITO',
      description: 'Authentication mode'
    });
  }
  
  /**
   * Get optional SSM parameter value
   */
  private getOptionalSsmParameter(parameterName: string): string | undefined {
    try {
      return ssm.StringParameter.valueForStringParameter(this, parameterName);
    } catch {
      return undefined;
    }
  }
  
  private get stack(): Stack {
    return Stack.of(this);
  }
}