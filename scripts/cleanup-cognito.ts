import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { CloudFormationClient } from '@aws-sdk/client-cloudformation'
import { STSClient } from '@aws-sdk/client-sts'
import {
    applyCleanupPlan,
    buildCleanupPlan,
    type CleanupClients,
} from './lib/cognito-cleanup'

const HELP = `Clean up orphaned MCR CDK review Cognito pools in DEV ONLY.

Read-only plan:
  pnpm --filter scripts exec tsx cleanup-cognito.ts --plan FILE --dev-account-id ACCOUNT
      [--min-age-days 7] [--region us-east-1]

Delete a reviewed plan, oldest candidates first (maximum 100 per batch):
  pnpm --filter scripts exec tsx cleanup-cognito.ts --apply FILE --dev-account-id ACCOUNT
      --confirm-delete ACCOUNT --audit-log FILE [--limit 10]

Run from the repository root with dependencies installed; no build is required.
Use AWS_PROFILE or standard AWS SDK credentials. No default mode deletes anything.
Plans expire after 24 hours. Read scripts/README-cognito-cleanup.md before applying.
`

async function main(): Promise<void> {
    const { values: args } = parseArgs({
        options: {
            help: { type: 'boolean' },
            plan: { type: 'string' },
            apply: { type: 'string' },
            'dev-account-id': { type: 'string' },
            region: { type: 'string' },
            'min-age-days': { type: 'string' },
            'confirm-delete': { type: 'string' },
            'audit-log': { type: 'string' },
            limit: { type: 'string' },
        },
        strict: true,
        allowPositionals: false,
    })
    if (args.help) {
        console.info(HELP)
        return
    }
    if (Boolean(args.plan) === Boolean(args.apply) || !args['dev-account-id'])
        throw new Error(HELP)
    const account = args['dev-account-id']
    const region = args.region ?? 'us-east-1'
    if (region !== 'us-east-1')
        throw new Error('Only the MCR dev region us-east-1 is supported')
    const clientConfig = {
        region,
        maxAttempts: 10,
        retryMode: 'adaptive' as const,
    }
    const clients: CleanupClients = {
        cognito: new CognitoIdentityProviderClient(clientConfig),
        cloudFormation: new CloudFormationClient(clientConfig),
        sts: new STSClient(clientConfig),
    }
    if (args.plan) {
        if (args['confirm-delete'] || args['audit-log'] || args.limit)
            throw new Error('Deletion options cannot be used in plan mode')
        const plan = await buildCleanupPlan(clients, {
            accountId: account,
            region,
            minAgeDays: Number(args['min-age-days'] ?? 7),
        })
        // Do not overwrite a previously reviewed plan. Reports may contain operational metadata.
        writeFileSync(args.plan, JSON.stringify(plan, null, 2) + '\n', {
            flag: 'wx',
            mode: 0o600,
        })
        console.info(
            `Read-only inventory: ${plan.candidates.length} candidates, ${plan.skipped.length} protected/skipped. Saved ${args.plan}`
        )
        return
    }
    if (args['min-age-days'])
        throw new Error(
            'Age threshold is fixed by the plan; regenerate to change it'
        )
    if (args['confirm-delete'] !== account || !args['audit-log'])
        throw new Error(
            'Apply requires --confirm-delete ACCOUNT and --audit-log FILE'
        )
    const plan: unknown = JSON.parse(readFileSync(args.apply!, 'utf8'))
    // Exclusive creation also prevents accidentally sharing/overwriting an audit file.
    writeFileSync(args['audit-log'], '', { flag: 'wx', mode: 0o600 })
    const auditFile = args['audit-log']
    await applyCleanupPlan(clients, plan, {
        accountId: account,
        confirmDelete: args['confirm-delete'],
        limit: Number(args.limit ?? 10),
        audit(event) {
            const line = JSON.stringify({
                at: new Date().toISOString(),
                accountId: account,
                region,
                ...event,
            })
            appendFileSync(auditFile, line + '\n')
            console.info(line)
        },
    })
    console.info(
        `Batch finished. Audit log: ${auditFile}. Review results; regenerate the plan before the next batch.`
    )
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
})
