import * as cdk from 'aws-cdk-lib'
import { UiStack } from './stacks/ui'

const app = new cdk.App()

// Get environment variables or context values
const stage = app.node.tryGetContext('stage') || 'dev'
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
}

// Create the UI stack
new UiStack(app, `${stage}-ui`, {
    stage,
    env,
    tags: {
        Environment: stage,
        Service: 'ui',
    },
})

app.synth()
