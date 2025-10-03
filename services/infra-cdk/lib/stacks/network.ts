import { BaseStack, type BaseStackProps } from '../constructs/base'
import type { Construct } from 'constructs'
import {
    type ISecurityGroup,
    type IVpc,
    SecurityGroup,
    Vpc,
} from 'aws-cdk-lib/aws-ec2'
import { CfnOutput } from 'aws-cdk-lib'

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
    public readonly vpc: IVpc
    public readonly lambdaSecurityGroup: ISecurityGroup

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

        // Create outputs for other stacks to reference
        this.createOutputs()
    }

    /**
     * Validate required environment variables are present
     */
    private validateEnvironment(): void {
        const required = [
            'VPC_ID',
            'SG_ID',
            'SUBNET_PRIVATE_A_ID',
            'SUBNET_PRIVATE_B_ID',
            'SUBNET_PRIVATE_C_ID',
        ]
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
    private importVpc(): IVpc {
        return Vpc.fromLookup(this, 'ExistingVpc', {
            vpcId: process.env.VPC_ID!,
        })
    }

    /**
     * Import existing security group using SG_ID environment variable
     * Same pattern as serverless: securityGroupIds: - ${self:custom.sgId}
     */
    private importSecurityGroup(): ISecurityGroup {
        return SecurityGroup.fromSecurityGroupId(
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

    /**
     * Create stack outputs for other stacks to reference
     */
    private createOutputs(): void {
        new CfnOutput(this, 'VpcId', {
            value: this.vpc.vpcId,
            exportName: this.exportName('VpcId'),
            description: 'VPC ID for Lambda functions',
        })

        new CfnOutput(this, 'LambdaSecurityGroupId', {
            value: this.lambdaSecurityGroup.securityGroupId,
            exportName: this.exportName('LambdaSecurityGroupId'),
            description: 'Security Group ID for Lambda functions',
        })

        // Export subnet IDs for Lambda functions
        const subnetIds = this.getPrivateSubnetIds()
        subnetIds.forEach((subnetId, index) => {
            new CfnOutput(
                this,
                `PrivateSubnetId${String.fromCharCode(65 + index)}`,
                {
                    value: subnetId,
                    exportName: this.exportName(
                        `PrivateSubnetId${String.fromCharCode(65 + index)}`
                    ),
                    description: `Private subnet ${String.fromCharCode(65 + index)} ID`,
                }
            )
        })
    }
}
