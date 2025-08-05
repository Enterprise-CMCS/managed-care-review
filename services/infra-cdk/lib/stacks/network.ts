import { BaseStack, type BaseStackProps } from '../constructs/base'
import type { Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'

export interface NetworkProps extends BaseStackProps {
    // No additional props needed - everything comes from environment variables
}

/**
 * Simplified Network stack that imports existing VPC and security groups
 * Matches serverless deployment pattern: uses environment variables, no SSM lookups
 *
 * Environment variables required:
 * - VPC_ID: The existing VPC ID to use
 * - SG_ID: The existing security group ID for Lambda functions
 */
export class Network extends BaseStack {
    public readonly vpc: ec2.IVpc
    public readonly lambdaSecurityGroup: ec2.ISecurityGroup

    constructor(scope: Construct, id: string, props: NetworkProps) {
        super(scope, id, {
            ...props,
            description:
                'Network stack for Managed Care Review - imports existing VPC and security groups',
        })

        this.validateEnvironment()

        // Initialize resources directly in constructor (standard CDK pattern)
        this.vpc = this.importVpc()
        this.lambdaSecurityGroup = this.importSecurityGroup()
    }

    /**
     * Validate required environment variables are present
     */
    private validateEnvironment(): void {
        const required = ['VPC_ID', 'SG_ID']
        const missing = required.filter((envVar) => !process.env[envVar])

        if (missing.length > 0) {
            throw new Error(
                `Missing required environment variables: ${missing.join(', ')}`
            )
        }
    }

    /**
     * Import existing VPC using VPC_ID environment variable
     * Same pattern as serverless: vpcId: ${env:VPC_ID}
     */
    private importVpc(): ec2.IVpc {
        return ec2.Vpc.fromLookup(this, 'ExistingVpc', {
            vpcId: process.env.VPC_ID!,
        })
    }

    /**
     * Import existing security group using SG_ID environment variable
     * Same pattern as serverless: securityGroupIds: - ${self:custom.sgId}
     */
    private importSecurityGroup(): ec2.ISecurityGroup {
        return ec2.SecurityGroup.fromSecurityGroupId(
            this,
            'ExistingLambdaSG',
            process.env.SG_ID!
        )
    }

    /**
     * Get private subnet IDs from environment variables
     * Same pattern as serverless privateSubnets array
     */
    public getPrivateSubnetIds(): string[] {
        return [
            process.env.SUBNET_PRIVATE_A_ID!,
            process.env.SUBNET_PRIVATE_B_ID!,
            process.env.SUBNET_PRIVATE_C_ID!,
        ].filter(Boolean)
    }

    /**
     * Get VPC configuration for Lambda functions
     * Matches serverless vpc configuration exactly
     */
    public getVpcConfig(): { securityGroupIds: string[]; subnetIds: string[] } {
        return {
            securityGroupIds: [process.env.SG_ID!],
            subnetIds: this.getPrivateSubnetIds(),
        }
    }
}
