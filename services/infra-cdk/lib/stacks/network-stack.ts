import { BaseStack, BaseStackProps, ImportedVpc, ServiceRegistry } from '@constructs/base';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ResourceNames } from '@config/index';
import { VPN_SSM_PARAMS } from '@config/index';
import * as ssm from 'aws-cdk-lib/aws-ssm';

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
  public vpnSecurityGroups: ec2.ISecurityGroup[];

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

    // Import VPN security groups from SSM parameters
    this.importVpnSecurityGroups();

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

    // Allow VPN access to database
    if (this.vpnSecurityGroups && this.vpnSecurityGroups.length > 0) {
      this.vpnSecurityGroups.forEach((vpnSg, index) => {
        this.databaseSecurityGroup.addIngressRule(
          vpnSg,
          ec2.Port.tcp(5432),
          `Allow VPN access to PostgreSQL database (${index + 1})`
        );
      });
    }

    // Stage-specific rules would be defined in the environment config if needed
    // No additional rules currently required
  }

  /**
   * Import VPN security groups from SSM parameters
   */
  private importVpnSecurityGroups(): void {
    this.vpnSecurityGroups = [];

    try {
      // Try to get VPN security group ID from SSM
      const vpnSecurityGroupId = ssm.StringParameter.valueFromLookup(
        this,
        VPN_SSM_PARAMS.VPN_SECURITY_GROUP
      );

      // Only import if we got a valid value (not the dummy token)
      if (vpnSecurityGroupId && !vpnSecurityGroupId.includes('dummy-value')) {
        const vpnSg = ec2.SecurityGroup.fromSecurityGroupId(
          this,
          'VpnSecurityGroup',
          vpnSecurityGroupId
        );
        this.vpnSecurityGroups.push(vpnSg);
      }
    } catch (error) {
      console.log('VPN security group not found in SSM, skipping import');
    }

    try {
      // Try to get shared services security group ID from SSM
      const sharedServicesGroupId = ssm.StringParameter.valueFromLookup(
        this,
        VPN_SSM_PARAMS.SHARED_SERVICES_SG
      );

      // Only import if we got a valid value (not the dummy token)
      if (sharedServicesGroupId && !sharedServicesGroupId.includes('dummy-value')) {
        const sharedSg = ec2.SecurityGroup.fromSecurityGroupId(
          this,
          'SharedServicesSecurityGroup',
          sharedServicesGroupId
        );
        this.vpnSecurityGroups.push(sharedSg);
      }
    } catch (error) {
      console.log('Shared services security group not found in SSM, skipping import');
    }
  }
}
