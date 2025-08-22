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
import { App, CliCredentialsStackSynthesizer } from 'aws-cdk-lib'
import { GitHubOidcServiceRoleStack } from '../lib/stacks'
import { getCdkEnvironment } from '../lib/config'

const app = new App({
    defaultStackSynthesizer: new CliCredentialsStackSynthesizer({
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

// Create only the GitHub OIDC service role
new GitHubOidcServiceRoleStack(app, `MCR-GitHubOIDC-${stage}`, {
    env,
    stage,
    description: `GitHub OIDC service role for (${stage})`,
})

console.info(`OIDC-only CDK app initialized for stage: ${stage}`)
