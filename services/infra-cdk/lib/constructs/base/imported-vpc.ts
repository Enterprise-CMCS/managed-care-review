import { Construct } from 'constructs'
import {
    type ISubnet,
    type IVpc,
    type SubnetSelection,
    Vpc,
} from 'aws-cdk-lib/aws-ec2'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'

export interface ImportedVpcProps {
    stage: string
}

/**
 * Construct to import existing VPC and related network resources.
 * This avoids creating new VPC resources and uses what's already deployed.
 * Security groups will be created by NetworkStack, not imported here.
 */
export class ImportedVpc extends Construct {
    public readonly vpc: IVpc
    public readonly privateSubnets: ISubnet[]

    constructor(scope: Construct, id: string, props: ImportedVpcProps) {
        super(scope, id)

        // Get VPC configuration from SSM Parameter Store
        const vpcId = StringParameter.valueForStringParameter(
            scope,
            '/configuration/default/vpc/id'
        )

        // Get VPC CIDR block from SSM
        const vpcCidrBlock = StringParameter.valueForStringParameter(
            scope,
            '/configuration/default/vpc/cidr'
        )

        // Get individual private subnet IDs from SSM
        const privateSubnetIdA = StringParameter.valueForStringParameter(
            scope,
            '/configuration/default/vpc/subnets/private/a/id'
        )

        const privateSubnetIdB = StringParameter.valueForStringParameter(
            scope,
            '/configuration/default/vpc/subnets/private/b/id'
        )

        const privateSubnetIdC = StringParameter.valueForStringParameter(
            scope,
            '/configuration/default/vpc/subnets/private/c/id'
        )

        // Build arrays for subnet IDs and availability zones
        const privateSubnetIds = [
            privateSubnetIdA,
            privateSubnetIdB,
            privateSubnetIdC,
        ]

        // Get the region and construct availability zones
        const region = scope.node.tryGetContext('aws:cdk:region') || 'us-east-1'
        const availabilityZones = [`${region}a`, `${region}b`, `${region}c`]

        // Import VPC using attributes (works with CDK Tokens)
        this.vpc = Vpc.fromVpcAttributes(this, 'ImportedVpc', {
            vpcId: vpcId,
            vpcCidrBlock: vpcCidrBlock,
            availabilityZones: availabilityZones,
            privateSubnetIds: privateSubnetIds,
            privateSubnetRouteTableIds: privateSubnetIds, // Assume one route table per subnet
        })

        // Get the private subnets from the imported VPC
        this.privateSubnets = this.vpc.privateSubnets
    }

    /**
     * Get subnet selection for Lambda functions
     */
    get lambdaSubnetSelection(): SubnetSelection {
        return {
            subnets: this.privateSubnets,
        }
    }

    /**
     * Get subnet selection for databases
     */
    get databaseSubnetSelection(): SubnetSelection {
        return {
            subnets: this.privateSubnets,
        }
    }

    /**
     * Get all availability zones
     */
    get availabilityZones(): string[] {
        return [...new Set(this.privateSubnets.map((s) => s.availabilityZone))]
    }
}
