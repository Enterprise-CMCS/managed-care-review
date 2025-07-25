import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables based on stage
export function loadEnvironment(stage?: string): void {
  // Load base .env file
  dotenv.config();
  
  // Load stage-specific .env file if stage is provided
  if (stage) {
    dotenv.config({ path: resolve(process.cwd(), `.env.${stage}`) });
  }
}

// Type-safe environment variable access
export class Environment {
  static get(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Environment variable ${key} is not set`);
    }
    return value;
  }

  static getOptional(key: string, defaultValue?: string): string | undefined {
    return process.env[key] || defaultValue;
  }

  static getAccountId(stage: string): string {
    // Simple, direct environment variable lookup - no CDK App creation
    return process.env.CDK_DEFAULT_ACCOUNT || 
           process.env[`${stage.toUpperCase()}_ACCOUNT_ID`] || 
           process.env.AWS_ACCOUNT_ID || 
           (() => { throw new Error(`Account ID not found. Set CDK_DEFAULT_ACCOUNT or ${stage.toUpperCase()}_ACCOUNT_ID`); })();
  }


  static getRegion(): string {
    return this.get('AWS_REGION');
  }

  static getExistingResourceArn(stage: string, resourceType: string): string | undefined {
    const key = `${stage.toUpperCase()}_${resourceType.toUpperCase()}_ARN`;
    return this.getOptional(key);
  }
}

// Validate required environment variables for a stage
export function validateEnvironment(stage: string): void {
  // Only validate truly required environment variables
  const required = [
    'AWS_REGION'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
