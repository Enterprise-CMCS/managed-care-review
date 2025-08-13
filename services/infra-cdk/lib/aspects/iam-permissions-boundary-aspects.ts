import * as cdk from "aws-cdk-lib";
import { IAspect } from "aws-cdk-lib";
import { IConstruct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export class IamPermissionsBoundaryAspect implements IAspect {
  private readonly permissionsBoundaryArn: string;

  constructor(permissionsBoundaryArn: string) {
    this.permissionsBoundaryArn = permissionsBoundaryArn;
  }

  public visit(node: IConstruct): void {
    // Apply to IAM roles
    if (node instanceof iam.Role) {
      const roleResource = node.node.defaultChild as iam.CfnRole;
      roleResource.addPropertyOverride("PermissionsBoundary", this.permissionsBoundaryArn);
    }
    // Low-level CloudFormation role resource
    else if (node instanceof iam.CfnRole) {
      node.addPropertyOverride("PermissionsBoundary", this.permissionsBoundaryArn);
    }
    
    // Apply to IAM users
    if (node instanceof iam.User) {
      const userResource = node.node.defaultChild as iam.CfnUser;
      userResource.addPropertyOverride("PermissionsBoundary", this.permissionsBoundaryArn);
    }
    // Low-level CloudFormation user resource
    else if (node instanceof iam.CfnUser) {
      node.addPropertyOverride("PermissionsBoundary", this.permissionsBoundaryArn);
    }
    
    // General check for CloudFormation resources
    if (cdk.CfnResource.isCfnResource(node)) {
      if ((node as cdk.CfnResource).cfnResourceType === "AWS::IAM::Role") {
        (node as iam.CfnRole).addPropertyOverride("PermissionsBoundary", this.permissionsBoundaryArn);
      } else if ((node as cdk.CfnResource).cfnResourceType === "AWS::IAM::User") {
        (node as iam.CfnUser).addPropertyOverride("PermissionsBoundary", this.permissionsBoundaryArn);
      }
    }
  }
}
