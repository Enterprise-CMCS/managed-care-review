import { CfnResource, type IAspect } from 'aws-cdk-lib'
import type { IConstruct } from 'constructs'
import { Role, CfnRole, User, CfnUser } from 'aws-cdk-lib/aws-iam'

export class IamPermissionsBoundaryAspect implements IAspect {
    private readonly permissionsBoundaryArn: string

    constructor(permissionsBoundaryArn: string) {
        this.permissionsBoundaryArn = permissionsBoundaryArn
    }

    public visit(node: IConstruct): void {
        // Apply to IAM roles
        if (node instanceof Role) {
            const roleResource = node.node.defaultChild as CfnRole
            roleResource.addPropertyOverride(
                'PermissionsBoundary',
                this.permissionsBoundaryArn
            )
        }
        // Low-level CloudFormation role resource
        else if (node instanceof CfnRole) {
            node.addPropertyOverride(
                'PermissionsBoundary',
                this.permissionsBoundaryArn
            )
        }

        // Apply to IAM users
        if (node instanceof User) {
            const userResource = node.node.defaultChild as CfnUser
            userResource.addPropertyOverride(
                'PermissionsBoundary',
                this.permissionsBoundaryArn
            )
        }
        // Low-level CloudFormation user resource
        else if (node instanceof CfnUser) {
            node.addPropertyOverride(
                'PermissionsBoundary',
                this.permissionsBoundaryArn
            )
        }

        // General check for CloudFormation resources
        if (CfnResource.isCfnResource(node)) {
            if ((node as CfnResource).cfnResourceType === 'AWS::IAM::Role') {
                ;(node as CfnRole).addPropertyOverride(
                    'PermissionsBoundary',
                    this.permissionsBoundaryArn
                )
            } else if (
                (node as CfnResource).cfnResourceType === 'AWS::IAM::User'
            ) {
                ;(node as CfnUser).addPropertyOverride(
                    'PermissionsBoundary',
                    this.permissionsBoundaryArn
                )
            }
        }
    }
}
