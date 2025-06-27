import { BaseStack, BaseStackProps, ImportedVpc, ServiceRegistry } from '@constructs/base';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { STACK_NAMES, ResourceNames } from '@config/constants';

export interface NetworkStackProps extends BaseStackProps {
  // No additional props needed since we're importing
}

/**
 * Network stack that imports existing VPC and network resources
 * This stack does NOT create new VPC resources
 */
export class NetworkStack extends BaseStack {
  public importedVpc: ImportedVpc;
  public vpc: ec2.IVpc;
  public lambdaSecurityGroup: ec2.ISecurityGroup;
  public databaseSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, {
      ...props,
      description: 'Network stack for Managed Care Review - imports existing VPC resources'
    });
    
    // Define resources after base initialization
    this.defineResources();
  }

  /**
   * Define network resources (imports VPC, creates security groups)
   */
  protected defineResources(): void {
    // Import existing VPC from SSM Parameter Store
    this.importedVpc = new ImportedVpc(this, 'ImportedVpc', {
      stage: this.stage
    });

    // Set VPC reference
    this.vpc = this.importedVpc.vpc;

    // Create security groups instead of importing
    this.createSecurityGroups();

    // Store VPC and security group information in Parameter Store for cross-stack reference
    this.storeNetworkInfo();

    // Add security group rules
    this.configureSecurityGroups();
  }

  /**
   * Store network information in Parameter Store
   */
  private storeNetworkInfo(): void {
    // Store VPC ID (even though it's imported, other stacks might need it)
    ServiceRegistry.putVpcId(this, this.stage, this.vpc.vpcId);

    // Store security group IDs
    ServiceRegistry.putValue(
      this,
      'network',
      'lambda-sg-id',
      this.lambdaSecurityGroup.securityGroupId,
      this.stage,
      'Lambda security group ID'
    );

    ServiceRegistry.putValue(
      this,
      'network',
      'database-sg-id',
      this.databaseSecurityGroup.securityGroupId,
      this.stage,
      'Database security group ID'
    );

  }

  /**
   * Create security groups for Lambda and Database
   */
  private createSecurityGroups(): void {
    // Create Lambda security group
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: `Security group for Lambda functions - ${this.stage}`,
      securityGroupName: ResourceNames.resourceName('lambda', 'sg', this.stage)
    });

    // Add egress rules for Lambda
    this.lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS outbound traffic for AWS service calls'
    );

    // Create Database security group
    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: `Security group for Aurora PostgreSQL database - ${this.stage}`,
      securityGroupName: ResourceNames.resourceName('database', 'sg', this.stage)
    });

    // Allow all outbound traffic from database (for replication, backups, etc.)
    this.databaseSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.allTraffic(),
      'Allow all outbound traffic'
    );
  }

  /**
   * Configure security group rules
   */
  private configureSecurityGroups(): void {
    // Allow Lambda to connect to database on PostgreSQL default port
    this.databaseSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(5432), // Using default PostgreSQL port to match Serverless
      'Allow Lambda functions to connect to PostgreSQL database'
    );

    // Allow database to connect to itself (for replication)
    this.databaseSecurityGroup.addIngressRule(
      this.databaseSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow database cluster internal communication'
    );

    // Add stage-specific rules
    if (this.stage === 'dev') {
      // Dev might need additional access for debugging
      // But we'll keep it minimal for security
    }
  }
}
