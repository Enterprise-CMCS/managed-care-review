import { Stack, StackProps, Tags, Aspects } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AwsSolutionsChecks } from 'cdk-nag';
import { 
  MANDATORY_TAGS, 
  PROJECT_NAME, 
  ResourceNames 
} from '@config/constants';
import { StageConfig } from '@config/stage-config';

export interface BaseStackProps extends StackProps {
  stage: string;
  stageConfig: StageConfig;
  serviceName: string;
  description?: string;
}

/**
 * Base stack class that all MCR stacks should extend.
 * Provides common functionality like tagging, CDK Nag, and naming conventions.
 */
export abstract class BaseStack extends Stack {
  protected readonly stage: string;
  protected readonly stageConfig: StageConfig;
  protected readonly serviceName: string;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    const stackName = ResourceNames.stackName(props.serviceName, props.stage) + '-cdk';
    
    super(scope, id, {
      ...props,
      stackName,
      description: props.description || `${PROJECT_NAME} - ${props.serviceName} stack for ${props.stage}`,
      env: {
        account: props.stageConfig.account,
        region: props.stageConfig.region
      }
    });

    this.stage = props.stage;
    this.stageConfig = props.stageConfig;
    this.serviceName = props.serviceName;

    // Apply mandatory tags
    this.applyTags();

    // // Apply CDK Nag checks
    // this.applyCdkNag();

    // Set termination protection for protected stages (matches serverless config)
    if (['dev', 'val', 'prod', 'main'].includes(this.stage)) {
      this.terminationProtection = true;
    }
  }

  /**
   * Apply mandatory tags to all resources in the stack
   */
  private applyTags(): void {
    Tags.of(this).add(MANDATORY_TAGS.PROJECT, PROJECT_NAME);
    Tags.of(this).add(MANDATORY_TAGS.ENVIRONMENT, this.stage);
    Tags.of(this).add(MANDATORY_TAGS.MANAGED_BY, 'CDK');
    Tags.of(this).add(MANDATORY_TAGS.SERVICE, this.serviceName);
    
    // Add cost center tag for production
    if (this.stage === 'prod') {
      Tags.of(this).add(MANDATORY_TAGS.COST_CENTER, 'MCR-Production');
    }
  }

  /**
   * Apply CDK Nag checks to the stack
   */
  private applyCdkNag(): void {
    Aspects.of(this).add(new AwsSolutionsChecks({
      verbose: true,
      reports: true,
      logIgnores: false
    }));
  }

  /**
   * Helper method to suppress CDK Nag rules with proper documentation
   */
  protected suppressCdkNagRule(
    resource: Construct,
    rules: Array<{
      id: string;
      reason: string;
    }>
  ): void {
    // CDK_NAG_DISABLED: NagSuppressions.addResourceSuppressions(resource, rules);
  }

  /**
   * Helper method to suppress stack-level CDK Nag rules
   */
  protected suppressStackCdkNagRules(
    rules: Array<{
      id: string;
      reason: string;
    }>
  ): void {
    // CDK_NAG_DISABLED: NagSuppressions.addStackSuppressions(this, rules);
  }

  /**
   * Generate a CloudFormation export name
   */
  protected exportName(resourceName: string): string {
    return `${this.stackName}-${resourceName}`;
  }

  /**
   * Generate a resource name following naming conventions
   */
  protected resourceName(resourceType: string): string {
    return ResourceNames.resourceName(this.serviceName, resourceType, this.stage);
  }

  /**
   * Check if the stack is in production
   */
  protected get isProduction(): boolean { return this.stage === 'prod'; }

  /**
   * Check if the stack is in development
   */
  protected get isDevelopment(): boolean { return this.stage === 'dev'; }

  /**
   * Abstract method that child stacks must implement to define their resources
   */
  protected abstract defineResources(): void;
}
