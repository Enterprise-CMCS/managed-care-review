import { Stack, StackProps } from 'aws-cdk-lib';
import { stackName } from '../config';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends StackProps {
  stage: string;
  // Placeholder for future Datadog configuration
}

/**
 * Monitoring stack for Datadog integration (placeholder)
 */
export class MonitoringStack extends Stack {
  private readonly stage: string;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, {
      ...props,
      stackName: stackName('Monitoring', props.stage),
      description: 'Monitoring stack for Managed Care Review - Datadog integration (placeholder)'
    });
    
    this.stage = props.stage;
    this.defineResources();
  }

  private defineResources(): void {
    // Placeholder for future Datadog integration
    // TODO: Add Datadog agent configuration, API keys, and monitoring resources
  }
}
