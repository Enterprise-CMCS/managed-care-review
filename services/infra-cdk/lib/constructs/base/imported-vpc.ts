import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Fn } from 'aws-cdk-lib';
import { NetworkConfig } from '@config/stage-config';

export interface ImportedVpcProps {
  stage: string;
}

/**
 * Construct to import existing VPC and related network resources.
 * This avoids creating new VPC resources and uses what's already deployed.
 * Security groups will be created by NetworkStack, not imported here.
 */
export class ImportedVpc extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  public readonly databaseSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: ImportedVpcProps) {
    super(scope, id);

    // Get VPC configuration from SSM Parameter Store
    const vpcId = ssm.StringParameter.valueForStringParameter(
      scope, 
      '/configuration/default/vpc/id'
    );

    // Get VPC CIDR block from SSM
    const vpcCidrBlock = ssm.StringParameter.valueForStringParameter(
      scope, 
      '/configuration/default/vpc/cidr'
    );

    // Get individual private subnet IDs from SSM
    const privateSubnetIdA = ssm.StringParameter.valueForStringParameter(
      scope, 
      '/configuration/default/vpc/subnets/private/a/id'
    );
    
    const privateSubnetIdB = ssm.StringParameter.valueForStringParameter(
      scope, 
      '/configuration/default/vpc/subnets/private/b/id'
    );
    
    const privateSubnetIdC = ssm.StringParameter.valueForStringParameter(
      scope, 
      '/configuration/default/vpc/subnets/private/c/id'
    );

    // Build arrays for subnet IDs and availability zones
    const privateSubnetIds = [privateSubnetIdA, privateSubnetIdB, privateSubnetIdC];
    
    // Get the region and construct availability zones
    const region = scope.node.tryGetContext('aws:cdk:region') || 'us-east-1';
    const availabilityZones = [`${region}a`, `${region}b`, `${region}c`];

    // Import VPC using attributes (works with CDK Tokens)
    this.vpc = ec2.Vpc.fromVpcAttributes(this, 'ImportedVpc', {
      vpcId: vpcId,
      vpcCidrBlock: vpcCidrBlock,
      availabilityZones: availabilityZones,
      privateSubnetIds: privateSubnetIds,
      privateSubnetRouteTableIds: privateSubnetIds // Assume one route table per subnet
    });

    // Get the private subnets from the imported VPC
    this.privateSubnets = this.vpc.privateSubnets;

    // Note: Security groups will be created by NetworkStack, not imported
    // For now, create placeholder security groups that will be replaced
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'TempLambdaSG', {
      vpc: this.vpc,
      description: 'Temporary Lambda security group - will be replaced by NetworkStack'
    });

    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'TempDatabaseSG', {
      vpc: this.vpc,
      description: 'Temporary Database security group - will be replaced by NetworkStack'
    });
  }

  /**
   * Get subnet selection for Lambda functions
   */
  get lambdaSubnetSelection(): ec2.SubnetSelection {
    return {
      subnets: this.privateSubnets
    };
  }

  /**
   * Get subnet selection for databases
   */
  get databaseSubnetSelection(): ec2.SubnetSelection {
    return {
      subnets: this.privateSubnets
    };
  }

  /**
   * Get all availability zones
   */
  get availabilityZones(): string[] {
    return [...new Set(this.privateSubnets.map(s => s.availabilityZone))];
  }
}
