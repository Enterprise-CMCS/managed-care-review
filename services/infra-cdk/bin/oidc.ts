#!/usr/bin/env node

/**
 * OIDC-only CDK app entry point
 *
 * This app deploys ONLY the GitHub OIDC provider stack, with no dependencies
 * on lambda layers or other infrastructure. Used for bootstrapping OIDC
 * authentication in review environments before the full stack deployment.
 *
 * Usage:
 *   pnpm cdk deploy MCR-GitHubOIDC-<stage> --app 'pnpm tsx bin/oidc.ts' --context stage=<stage>
 */

import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { GitHubOidcStack } from '../lib/stacks'
import { getCdkEnvironment } from '../lib/config'

const app = new cdk.App({
    defaultStackSynthesizer: new cdk.CliCredentialsStackSynthesizer({
        qualifier: 'mcreview',
    }),
})

const stage = app.node.tryGetContext('stage') || process.env.STAGE_NAME

if (!stage) {
    throw new Error(
        'Stage name is required. Provide via --context stage=<stage> or STAGE_NAME env var'
    )
}

const env = getCdkEnvironment(stage)

// Create ONLY the GitHub OIDC stack - no dependencies on lambda layers or other infrastructure
new GitHubOidcStack(app, `MCR-GitHubOIDC-${stage}`, {
    env,
    description: `GitHub OIDC provider for MCR CI/CD (${stage})`,
})

console.info(`OIDC-only CDK app initialized for stage: ${stage}`)
