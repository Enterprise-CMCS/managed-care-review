import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Stack } from 'aws-cdk-lib';

export interface GeoRestrictedWafProps {
  /**
   * Name prefix for the WebACL
   */
  namePrefix: string;
  
  /**
   * Stage name (dev, val, prod)
   */
  stage: string;
  
  /**
   * Optional list of country codes to allow
   * Defaults to US + territories
   */
  allowedCountryCodes?: string[];
}

/**
 * WAF WebACL for geo-restricting CloudFront distributions
 * Matches serverless configuration exactly
 */
export class GeoRestrictedWaf extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;
  
  constructor(scope: Construct, id: string, props: GeoRestrictedWafProps) {
    super(scope, id);
    
    const allowedCountries = props.allowedCountryCodes || [
      'US', // USA
      'PR', // Puerto Rico
      'GU', // Guam
      'VI', // US Virgin Islands
      'MP', // Northern Mariana Islands
      'UM', // US Minor Outlying Islands
    ];
    
    this.webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      scope: 'CLOUDFRONT',
      defaultAction: {
        block: {}
      },
      rules: [
        {
          name: `${props.stage}-allow-usa-plus-territories`,
          priority: 0,
          action: {
            allow: {}
          },
          statement: {
            geoMatchStatement: {
              countryCodes: allowedCountries
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'WafWebAcl'
          }
        }
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${props.stage}-webacl`
      }
    });
  }
}