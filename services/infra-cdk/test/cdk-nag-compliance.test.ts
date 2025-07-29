import { App, Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { FoundationStack } from '../lib/stacks/foundation-stack';
import { NetworkStack } from '../lib/stacks/network-stack';
import { StageConfiguration } from '../lib/config';

// Mock environment
process.env.DEV_ACCOUNT_ID = '123456789012';
process.env.AWS_REGION = 'us-east-1';
process.env.DEV_VPC_ID = 'vpc-12345';
process.env.DEV_PRIVATE_SUBNET_IDS = 'subnet-123,subnet-456';
process.env.DEV_LAMBDA_SG_ID = 'sg-12345';
process.env.DEV_DATABASE_SG_ID = 'sg-67890';

describe('CDK Nag Compliance', () => {
  let app: App;

  beforeEach(() => {
    app = new App();
  });

  test('Foundation Stack passes CDK Nag checks', () => {
    const stageConfig = StageConfiguration.get('dev');
    const stack = new FoundationStack(app, 'test-foundation', {
      stage: 'dev',
      stageConfig,
      serviceName: 'foundation'
    });

    // Apply CDK Nag
    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
    
    // Synthesize to trigger validation
    app.synth();
    
    // Check for errors
    const errors = Annotations.fromStack(stack).findError(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*')
    );
    
    expect(errors).toHaveLength(0);
  });

  test('Network Stack passes CDK Nag checks', () => {
    const stageConfig = StageConfiguration.get('dev');
    
    // Create foundation stack first (dependency)
    const foundationStack = new FoundationStack(app, 'test-foundation', {
      stage: 'dev',
      stageConfig,
      serviceName: 'foundation'
    });

    const networkStack = new NetworkStack(app, 'test-network', {
      stage: 'dev',
      stageConfig,
      serviceName: 'network'
    });
    networkStack.addDependency(foundationStack);

    // Apply CDK Nag
    Aspects.of(networkStack).add(new AwsSolutionsChecks({ verbose: true }));
    
    // Synthesize to trigger validation
    app.synth();
    
    // Check for errors
    const errors = Annotations.fromStack(networkStack).findError(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*')
    );
    
    expect(errors).toHaveLength(0);
  });

  test('All stacks have required tags', () => {
    const stageConfig = StageConfiguration.get('dev');
    const stack = new FoundationStack(app, 'test-stack', {
      stage: 'dev',
      stageConfig,
      serviceName: 'test'
    });

    const tags = stack.tags.tagValues();
    
    expect(tags['Project']).toBeDefined();
    expect(tags['Environment']).toBeDefined();
    expect(tags['ManagedBy']).toBeDefined();
    expect(tags['Service']).toBeDefined();
  });
});
