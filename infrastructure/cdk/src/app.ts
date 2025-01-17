import * as cdk from 'aws-cdk-lib'
import { UiStack } from './stacks/ui'

const app = new cdk.App()

// Get environment variables or context values
const stage = app.node.tryGetContext('stage') || 'dev'
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
}

const customSynthesizer = new cdk.DefaultStackSynthesizer({
    qualifier: 'mcreview',
    fileAssetsBucketName: `cdk-mcreview-assets-${env.account}-${env.region}`,
    bucketPrefix: '',
    cloudFormationExecutionRole: `arn:aws:iam::${env.account}:role/delegatedadmin/developer/cdk-mcreview-cfn-exec-role-${env.account}-${env.region}`,
    deployRoleArn: `arn:aws:iam::${env.account}:role/delegatedadmin/developer/cdk-mcreview-deploy-role-${env.account}-${env.region}`,
    fileAssetPublishingRoleArn: `arn:aws:iam::${env.account}:role/delegatedadmin/developer/cdk-mcreview-file-publishing-role-${env.account}-${env.region}`,
    imageAssetPublishingRoleArn: `arn:aws:iam::${env.account}:role/delegatedadmin/developer/cdk-mcreview-image-publishing-role-${env.account}-${env.region}`,
    lookupRoleArn: `arn:aws:iam::${env.account}:role/delegatedadmin/developer/cdk-mcreview-lookup-role-${env.account}-${env.region}`,
})

// Create the UI stack
new UiStack(app, `ui-${stage}`, {
    synthesizer: customSynthesizer,
    stage,
    env,
    permissionsBoundary: cdk.PermissionsBoundary.fromArn(
        cdk.Arn.format({
            partition: 'aws',
            service: 'iam',
            region: '',
            account: env.account,
            resource: 'policy',
            resourceName:
                'cms-cloud-admin/ct-ado-poweruser-permissions-boundary-policy',
        })
    ),
    tags: {
        Environment: stage,
        Service: 'ui',
        DeployBy: 'CDK',
    },
})

app.synth()
