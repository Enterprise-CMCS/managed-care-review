import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Duration } from 'aws-cdk-lib';

export interface SecurityHeadersPolicyProps {
  /**
   * Stage name
   */
  stage: string;
  
  /**
   * Website name
   */
  websiteName: string;
  
  /**
   * Enable HSTS header
   */
  enableHsts?: boolean;
  
  /**
   * X-Frame-Options setting
   * @default DENY
   */
  frameOption?: cloudfront.HeadersFrameOption;
  
  /**
   * Enable serverless parity mode (HSTS only)
   * When true, only includes HSTS header to match serverless exactly
   */
  parityMode?: boolean;
}

/**
 * CloudFront Response Headers Policy for security headers
 * Matches all security headers from serverless configuration
 */
export class SecurityHeadersPolicy extends Construct {
  public readonly policy: cloudfront.ResponseHeadersPolicy;
  
  constructor(scope: Construct, id: string, props: SecurityHeadersPolicyProps) {
    super(scope, id);
    
    this.policy = new cloudfront.ResponseHeadersPolicy(this, 'Policy', {
      responseHeadersPolicyName: `mcr-cdk-${props.stage}-${props.websiteName}-security-headers`,
      comment: `Security headers for ${props.websiteName} in ${props.stage}`,
      securityHeadersBehavior: {
        // In parity mode, only include HSTS (serverless has only HSTS)
        ...(props.parityMode ? {
          // Strict-Transport-Security (HSTS) - matches serverless exactly
          ...(props.enableHsts !== false && {
            strictTransportSecurity: { 
              accessControlMaxAge: Duration.seconds(63072000), // 2 years
              includeSubdomains: true,
              preload: true,
              override: true 
            }
          })
        } : {
          // Full security headers (CDK enhanced mode)
          // X-Content-Type-Options
          contentTypeOptions: { 
            override: true 
          },
          
          // X-Frame-Options
          frameOptions: { 
            frameOption: props.frameOption || cloudfront.HeadersFrameOption.DENY, 
            override: true 
          },
          
          // Referrer-Policy
          referrerPolicy: { 
            referrerPolicy: cloudfront.HeadersReferrerPolicy.SAME_ORIGIN, 
            override: true 
          },
          
          // Strict-Transport-Security (HSTS)
          ...(props.enableHsts !== false && {
            strictTransportSecurity: { 
              accessControlMaxAge: Duration.seconds(63072000), // 2 years
              includeSubdomains: true,
              preload: true,
              override: true 
            }
          }),
          
          // X-XSS-Protection
          xssProtection: { 
            protection: true, 
            modeBlock: true, 
            override: true 
          }
        })
      },
      
      // Custom headers only in enhanced mode (not serverless parity)
      ...(!props.parityMode && {
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'Permissions-Policy',
              value: 'geolocation=(), microphone=(), camera=()',
              override: true
            },
            {
              header: 'X-Permitted-Cross-Domain-Policies',
              value: 'none',
              override: true
            }
          ]
        }
      })
    });
  }
}
