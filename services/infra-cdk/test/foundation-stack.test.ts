import { Template } from 'aws-cdk-lib/assertions';
import { App } from 'aws-cdk-lib';
import { FoundationStack } from '../lib/stacks/foundation-stack';
import { StageConfiguration } from '../lib/config';

// Mock environment
process.env.DEV_ACCOUNT_ID = '123456789012';
process.env.AWS_REGION = 'us-east-1';
process.env.DEV_VPC_ID = 'vpc-12345';
process.env.DEV_PRIVATE_SUBNET_IDS = 'subnet-123,subnet-456';
process.env.DEV_LAMBDA_SG_ID = 'sg-12345';

describe('Foundation Stack', () => {
  let app: App;
  let stack: FoundationStack;
  let template: Template;

  beforeEach(() => {
    app = new App();
    const stageConfig = StageConfiguration.get('dev');
    
    stack = new FoundationStack(app, 'test-foundation-stack', {
      stage: 'dev',
      stageConfig,
      serviceName: 'foundation'
    });
    
    template = Template.fromStack(stack);
  });

  test('Stack creates SSM parameters', () => {
    // Check that SSM parameters are created
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/mcr/dev/foundation/initialized'
    });
    
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/mcr/dev/foundation/cdk-version'
    });
    
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/mcr/dev/config/stage'
    });
  });

  test('Stack has correct tags', () => {
    // Check stack-level tags
    const stackTags = stack.tags.tagValues();
    expect(stackTags['Project']).toBe('ManagedCareReview');
    expect(stackTags['Environment']).toBe('dev');
    expect(stackTags['ManagedBy']).toBe('CDK');
    expect(stackTags['Service']).toBe('foundation');
  });

  test('Stack has termination protection in prod', () => {
    // Create prod stack
    const prodConfig = StageConfiguration.get('prod');
    const prodStack = new FoundationStack(app, 'test-foundation-stack-prod', {
      stage: 'prod',
      stageConfig: prodConfig,
      serviceName: 'foundation'
    });
    
    expect(prodStack.terminationProtection).toBe(true);
  });
});
