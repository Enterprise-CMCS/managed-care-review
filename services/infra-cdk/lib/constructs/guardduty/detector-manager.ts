/**
 * GuardDuty Detector Manager
 * 
 * Manages the creation and configuration of GuardDuty detector
 * using a custom resource to handle existing detectors gracefully
 */

import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration, CustomResource, CfnOutput } from 'aws-cdk-lib';
import { GUARDDUTY_DEFAULTS } from '@config/constants';

export interface GuardDutyDetectorManagerProps {
  stage: string;
}

export class GuardDutyDetectorManager extends Construct {
  public readonly detectorId: string;
  public readonly detectorResource: CustomResource;

  constructor(scope: Construct, id: string, props: GuardDutyDetectorManagerProps) {
    super(scope, id);

    // Create Lambda handler for detector management
    const detectorHandler = this.createDetectorHandler();

    // Create custom resource to handle detector creation
    this.detectorResource = new CustomResource(this, 'GuardDutyDetectorResource', {
      serviceToken: detectorHandler.functionArn,
      resourceType: 'Custom::GuardDutyDetector',
      properties: {
        Enable: true,
        FindingPublishingFrequency: GUARDDUTY_DEFAULTS.FINDING_PUBLISHING_FREQUENCY
      }
    });

    this.detectorId = this.detectorResource.getAttString('DetectorId');

    // Output the detector ID
    new CfnOutput(this, 'GuardDutyDetectorId', {
      value: this.detectorId,
      description: 'GuardDuty Detector ID',
      exportName: `GuardDuty-${props.stage}-DetectorId`
    });
  }

  private createDetectorHandler(): lambda.Function {
    return new lambda.Function(this, 'DetectorHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { GuardDuty } = require('@aws-sdk/client-guardduty');
        const response = require('cfn-response');
        
        exports.handler = async (event, context) => {
          const guardduty = new GuardDuty();
          
          try {
            if (event.RequestType === 'Delete') {
              // Don't delete detectors on stack deletion
              await response.send(event, context, response.SUCCESS, {});
              return;
            }
            
            // Check if detector exists
            const { DetectorIds } = await guardduty.listDetectors({});
            
            if (DetectorIds && DetectorIds.length > 0) {
              // Detector exists, return its ID
              await response.send(event, context, response.SUCCESS, {
                DetectorId: DetectorIds[0]
              });
            } else {
              // Create new detector
              const { DetectorId } = await guardduty.createDetector({
                Enable: event.ResourceProperties.Enable,
                FindingPublishingFrequency: event.ResourceProperties.FindingPublishingFrequency,
                DataSources: { S3Logs: { Enable: true } }
              });
              
              await response.send(event, context, response.SUCCESS, {
                DetectorId
              });
            }
          } catch (error) {
            console.error('Error:', error);
            await response.send(event, context, response.FAILED, {
              Error: error.message
            });
          }
        };
      `),
      timeout: Duration.seconds(60),
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'guardduty:ListDetectors',
            'guardduty:CreateDetector'
          ],
          resources: ['*']
        })
      ]
    });
  }
}