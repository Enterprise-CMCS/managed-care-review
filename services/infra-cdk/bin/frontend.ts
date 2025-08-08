#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { getEnvironment, getCdkEnvironment, ResourceNames } from '../lib/config'
import { FrontendStack } from '../lib/stacks/frontend'

const app = new cdk.App()

// Get stage from context or environment
const stage = app.node.tryGetContext('stage') || process.env.STAGE_NAME
const env = getCdkEnvironment(stage)
const config = getEnvironment(stage)

// Create simple frontend stack
new FrontendStack(app, ResourceNames.stackName('Frontend', stage), {
    env,
    stage,
    stageConfig: config,
    serviceName: 'frontend',
})

// Add resource tags (matches network.ts pattern)
cdk.Tags.of(app).add('Project', 'mc-review')
cdk.Tags.of(app).add('Environment', stage)
cdk.Tags.of(app).add('ManagedBy', 'CDK')
cdk.Tags.of(app).add(
    'Repository',
    'https://github.com/Enterprise-CMCS/managed-care-review'
)

app.synth()
