import * as path from 'path';

/**
 * Ultra-clean path utilities for workspace-independent CDK deployment
 * 
 * This eliminates ALL workspace dependencies by using pre-built Lambda packages
 * instead of referencing workspace source code directly.
 */
export class CDKPaths {
  /**
   * Get absolute path to pre-built Lambda package
   * This completely eliminates workspace dependencies by using a pre-built zip
   */
  static getLambdaPackagePath(): string {
    // Resolve path relative to this file's location
    // Current file: services/infra-cdk/lib/config/paths.ts
    // Target: services/infra-cdk/lambda-code.zip
    return path.resolve(__dirname, '..', '..', 'lambda-code.zip');
  }

  /**
   * @deprecated Use getLambdaPackagePath() instead for workspace independence
   */
  static getAppApiPath(): string {
    // Still available for compatibility but deprecated
    return path.resolve(__dirname, '..', '..', '..', 'app-api');
  }
  
  /**
   * Get absolute path to a specific service directory
   * @param serviceName - Name of the service (e.g., 'app-api', 'app-web')
   */
  static getServicePath(serviceName: string): string {
    return path.resolve(__dirname, '..', '..', '..', serviceName);
  }
  
  /**
   * Get absolute path to packages directory
   * @param packageName - Name of the package
   */
  static getPackagePath(packageName: string): string {
    return path.resolve(__dirname, '..', '..', '..', '..', 'packages', packageName);
  }
  
  /**
   * Validate that the app-api path exists and is accessible
   * Throws error if path is invalid (helps catch deployment issues early)
   */
  static validateAppApiPath(): void {
    const appApiPath = this.getAppApiPath();
    const fs = require('fs');
    
    if (!fs.existsSync(appApiPath)) {
      throw new Error(`App API path does not exist: ${appApiPath}`);
    }
    
    // Check for package.json to ensure it's a valid Node.js project
    const packageJsonPath = path.join(appApiPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`App API package.json not found: ${packageJsonPath}`);
    }
  }
}

/**
 * Legacy compatibility - for gradual migration
 * @deprecated Use CDKPaths.getAppApiPath() instead
 */
export const getAppApiPath = (): string => CDKPaths.getAppApiPath();