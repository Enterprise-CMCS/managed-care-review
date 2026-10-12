import { test, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import {
    CognitoIdentityProviderClient,
    ListUserPoolsCommand,
    DescribeUserPoolCommand,
    DeleteUserPoolDomainCommand,
    DeleteUserPoolCommand,
    type UserPoolType,
} from '@aws-sdk/client-cognito-identity-provider'
import {
    CloudFormationClient,
    ListStacksCommand,
    ListStackResourcesCommand,
    DescribeStacksCommand,
    type StackStatus,
} from '@aws-sdk/client-cloudformation'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    applyCleanupPlan,
    buildCleanupPlan,
    type CleanupPlan,
    type CleanupAuditEvent,
} from '../lib/cognito-cleanup'

const ACCOUNT_ID = '123456789012'
const NOW = Date.parse('2026-10-09T12:00:00Z')
const DAY_MS = 86_400_000
const planOptions = { accountId: ACCOUNT_ID, region: 'us-east-1', now: NOW }
function makeUserPool(
    stage = 'orphan-review',
    id = 'us-east-1_test'
): UserPoolType {
    return {
        Id: id,
        Name: `${stage}-user-pool`,
        Arn: `arn:aws:cognito-idp:us-east-1:${ACCOUNT_ID}:userpool/${id}`,
        CreationDate: new Date(NOW - 30 * DAY_MS),
        LastModifiedDate: new Date(NOW - 30 * DAY_MS),
        UserPoolTags: {
            Project: 'Managed Care Review',
            ManagedBy: 'CDK',
            Service: 'cognito',
            Environment: stage,
        },
        DeletionProtection: 'INACTIVE',
        EstimatedNumberOfUsers: 3,
    }
}
function awsError(name: string, message = name): Error {
    return Object.assign(new Error(message), { name })
}

// One testing boundary: real SDK clients with send() mocked. Unexpected calls fail;
// none of the SDK clients can reach AWS. Fixtures describe AWS state, not a second API.
function mockAws(t: TestContext, pools = [makeUserPool()]) {
    const config = {
        region: 'us-east-1',
        credentials: { accessKeyId: 'offline', secretAccessKey: 'offline' },
    }
    const clients = {
        cognito: new CognitoIdentityProviderClient(config),
        cloudFormation: new CloudFormationClient(config),
        sts: new STSClient(config),
    }
    const state = {
        accountId: ACCOUNT_ID,
        pools: new Map(pools.map((pool) => [pool.Id!, pool])),
        stacks: [] as {
            StackId?: string
            StackName?: string
            StackStatus?: StackStatus
        }[],
        resources: new Map<
            string,
            { ResourceType?: string; PhysicalResourceId?: string }[]
        >(),
        stackLookups: new Map<string, StackStatus | Error>(),
        errors: new Map<string, Error>(),
        pageSize: 60,
        repeatStackToken: false,
        keepDomain: false,
        pollError: undefined as Error | undefined,
        requestedDomains: new Set<string>(),
        operations: [] as string[],
        audit: [] as CleanupAuditEvent[],
    }
    function page<T>(items: T[], token?: string) {
        const start = Number(token ?? 0)
        return {
            items: items.slice(start, start + state.pageSize),
            NextToken:
                start + state.pageSize < items.length
                    ? String(start + state.pageSize)
                    : undefined,
        }
    }
    const send = async (command: unknown) => {
        if (command instanceof DeleteUserPoolDomainCommand)
            state.operations.push(`domain:${command.input.UserPoolId}`)
        if (command instanceof DeleteUserPoolCommand)
            state.operations.push(`pool:${command.input.UserPoolId}`)
        const error = state.errors.get((command as object).constructor.name)
        if (error) throw error
        if (command instanceof GetCallerIdentityCommand)
            return { Account: state.accountId }
        if (command instanceof ListStacksCommand) {
            if (state.repeatStackToken)
                return { StackSummaries: [], NextToken: 'repeat' }
            const result = page(state.stacks, command.input.NextToken)
            return { StackSummaries: result.items, NextToken: result.NextToken }
        }
        if (command instanceof ListStackResourcesCommand) {
            const result = page(
                state.resources.get(command.input.StackName!) ?? [],
                command.input.NextToken
            )
            return {
                StackResourceSummaries: result.items,
                NextToken: result.NextToken,
            }
        }
        if (command instanceof ListUserPoolsCommand) {
            const result = page(
                [...state.pools.keys()],
                command.input.NextToken
            )
            return {
                UserPools: result.items.map((Id) => ({ Id })),
                NextToken: result.NextToken,
            }
        }
        if (command instanceof DescribeUserPoolCommand) {
            const id = command.input.UserPoolId!
            if (state.requestedDomains.has(id)) {
                state.operations.push(`poll:${id}`)
                if (state.pollError) throw state.pollError
            }
            const pool = state.pools.get(id)
            if (!pool) throw awsError('ResourceNotFoundException')
            return { UserPool: pool }
        }
        if (command instanceof DescribeStacksCommand) {
            const status = state.stackLookups.get(command.input.StackName!)
            if (status instanceof Error) throw status
            if (!status)
                throw awsError(
                    'ValidationError',
                    `Stack with id ${command.input.StackName} does not exist`
                )
            return { Stacks: [{ StackStatus: status }] }
        }
        if (command instanceof DeleteUserPoolDomainCommand) {
            state.requestedDomains.add(command.input.UserPoolId!)
            if (!state.keepDomain)
                delete state.pools.get(command.input.UserPoolId!)!.Domain
            return {}
        }
        if (command instanceof DeleteUserPoolCommand) {
            state.pools.delete(command.input.UserPoolId!)
            return {}
        }
        throw new Error('Unexpected AWS command')
    }
    t.mock.method(
        clients.cognito,
        'send',
        send as unknown as typeof clients.cognito.send
    )
    t.mock.method(
        clients.cloudFormation,
        'send',
        send as unknown as typeof clients.cloudFormation.send
    )
    t.mock.method(
        clients.sts,
        'send',
        send as unknown as typeof clients.sts.send
    )
    const applyOptions = {
        accountId: ACCOUNT_ID,
        confirmDelete: ACCOUNT_ID,
        limit: 10,
        now: NOW,
        sleep: async () => {},
        audit: (event: CleanupAuditEvent) => {
            state.audit.push(event)
        },
    }
    return { clients, state, applyOptions }
}
async function reviewedPlan(
    clients: Parameters<typeof buildCleanupPlan>[0]
): Promise<CleanupPlan> {
    // Match an actual plan file: dates are strings and undefined fields are omitted.
    return JSON.parse(
        JSON.stringify(await buildCleanupPlan(clients, planOptions))
    ) as CleanupPlan
}

test('planning is read-only, reports skipped pools, and orders eligible orphans oldest first', async (t) => {
    const newer = makeUserPool('newer', 'us-east-1_newer')
    const older = makeUserPool('older', 'us-east-1_older')
    older.CreationDate = new Date(NOW - 60 * DAY_MS)
    older.UserPoolTags!['aws:cloudformation:stack-id'] =
        `arn:aws:cloudformation:us-east-1:${ACCOUNT_ID}:stack/cognito-older-cdk/deleted-long-ago`
    const { clients, state } = mockAws(t, [newer, makeUserPool('dev'), older])
    const plan = await reviewedPlan(clients)
    assert.deepEqual(
        plan.candidates.map((pool) => pool.id),
        [older.Id, newer.Id]
    )
    assert.equal(plan.skipped.length, 1)
    assert.ok(plan.skipped[0].reason)
    assert.deepEqual(state.operations, [])
})

test('eligibility excludes persistent stages, ambiguous pools, young pools, and protected domains', async (t) => {
    // Intentionally independent of the production allowlist.
    const protectedStages = [
        'dev',
        'val',
        'prod',
        'qa',
        'main',
        'master',
        'develop',
        'impl',
        'production',
    ]
    const excluded = protectedStages.map((stage, i) =>
        makeUserPool(stage, `us-east-1_stage${i}`)
    )
    const changes: ((pool: UserPoolType) => void)[] = [
        (pool) => {
            pool.UserPoolTags = {}
        },
        (pool) => {
            pool.UserPoolTags!.Project = 'Other'
        },
        (pool) => {
            pool.UserPoolTags!.ManagedBy = 'Serverless'
        },
        (pool) => {
            pool.UserPoolTags!.Service = 'other'
        },
        (pool) => {
            pool.UserPoolTags!.Environment = 'bad--stage'
        },
        (pool) => {
            pool.Name = 'other-name'
        },
        (pool) => {
            pool.CreationDate = new Date(NOW - DAY_MS)
        },
        (pool) => {
            pool.DeletionProtection = 'ACTIVE'
        },
        (pool) => {
            delete pool.DeletionProtection
        },
        (pool) => {
            pool.CustomDomain = 'auth.example.com'
        },
        (pool) => {
            pool.Domain = 'unexpected-domain'
        },
        (pool) => {
            pool.UserPoolTags!['aws:cloudformation:stack-id'] =
                'unexpected-stack'
        },
    ]
    changes.forEach((change, i) => {
        const pool = makeUserPool('review', `us-east-1_rule${i}`)
        change(pool)
        excluded.push(pool)
    })
    const { clients, state } = mockAws(t, excluded)
    const plan = await reviewedPlan(clients)
    assert.equal(plan.candidates.length, 0)
    assert.equal(plan.skipped.length, excluded.length)
    assert.deepEqual(state.operations, [])
})

test('account confirmation, pool identity, region, age, and batch bounds fail closed', async (t) => {
    const { clients, state, applyOptions } = mockAws(t)
    const plan = await reviewedPlan(clients)
    for (const overrides of [
        { accountId: '999999999999' },
        { confirmDelete: '999999999999' },
        ...[0, -1, 101, 1.5].map((limit) => ({ limit })),
    ]) {
        await assert.rejects(
            applyCleanupPlan(clients, plan, { ...applyOptions, ...overrides })
        )
    }
    for (const overrides of [
        { region: 'us-west-2' },
        { minAgeDays: 0 },
        { accountId: 'bad' },
    ])
        await assert.rejects(
            buildCleanupPlan(clients, { ...planOptions, ...overrides })
        )
    state.accountId = '999999999999'
    await assert.rejects(
        buildCleanupPlan(clients, planOptions),
        /caller account/
    )
    await assert.rejects(
        applyCleanupPlan(clients, plan, applyOptions),
        /caller account/
    )
    state.accountId = ACCOUNT_ID
    state.pools.get('us-east-1_test')!.Arn =
        'arn:aws:cognito-idp:us-east-1:999999999999:userpool/us-east-1_test'
    await assert.rejects(
        applyCleanupPlan(clients, plan, applyOptions),
        /ARN mismatch/
    )
    assert.deepEqual(state.operations, [])
})

test('all inventory pages are checked; unrelated owners and non-deleted stage stacks protect pools', async (t) => {
    const owned = makeUserPool('owned', 'us-east-1_owned'),
        live = makeUserPool('live', 'us-east-1_live'),
        orphan = makeUserPool('orphan', 'us-east-1_orphan')
    const { clients, state } = mockAws(t, [owned, live, orphan])
    state.pageSize = 1
    state.stacks = [
        {
            StackId: 'foreign',
            StackName: 'unrelated',
            StackStatus: 'CREATE_COMPLETE',
        },
        {
            StackId: 'live',
            StackName: 'cognito-live-cdk',
            StackStatus: 'DELETE_FAILED',
        },
        {
            StackId: 'deleted',
            StackName: 'cognito-orphan-cdk',
            StackStatus: 'DELETE_COMPLETE',
        },
    ]
    state.resources.set('foreign', [
        { ResourceType: 'AWS::S3::Bucket' },
        {
            ResourceType: 'AWS::Cognito::UserPool',
            PhysicalResourceId: owned.Id,
        },
    ])
    for (const status of [
        'CREATE_IN_PROGRESS',
        'DELETE_IN_PROGRESS',
        'DELETE_FAILED',
        'UPDATE_ROLLBACK_FAILED',
    ] as StackStatus[]) {
        state.stacks[1].StackStatus = status
        const plan = await reviewedPlan(clients)
        assert.deepEqual(
            plan.candidates.map((pool) => pool.id),
            [orphan.Id]
        )
    }
    assert.deepEqual(state.operations, [])
})

test('inventory/read errors and repeated tokens abort; unknown stack errors are never absence', async (t) => {
    for (const [command, error] of [
        ['ListStacksCommand', awsError('AccessDenied')],
        ['ListStackResourcesCommand', awsError('Throttling')],
        ['DescribeUserPoolCommand', awsError('NotAuthorizedException')],
    ] as const) {
        const { clients, state, applyOptions } = mockAws(t)
        const plan = await reviewedPlan(clients)
        state.stacks = [
            {
                StackId: 'foreign',
                StackName: 'foreign',
                StackStatus: 'CREATE_COMPLETE',
            },
        ]
        state.errors.set(command, error)
        await assert.rejects(applyCleanupPlan(clients, plan, applyOptions))
        assert.deepEqual(state.operations, [])
    }
    for (const name of [
        'AccessDenied',
        'Throttling',
        'ValidationError',
        'ResourceNotFoundException',
    ]) {
        const { clients, state, applyOptions } = mockAws(t)
        const plan = await reviewedPlan(clients)
        state.stackLookups.set('cognito-orphan-review-cdk', awsError(name))
        await assert.rejects(applyCleanupPlan(clients, plan, applyOptions))
        assert.deepEqual(state.operations, [])
    }
    const { clients, state } = mockAws(t)
    state.repeatStackToken = true
    await assert.rejects(
        buildCleanupPlan(clients, planOptions),
        /Repeated pagination/
    )
    state.repeatStackToken = false
    state.pools.get('us-east-1_test')!.Name = undefined
    await assert.rejects(
        buildCleanupPlan(clients, planOptions),
        /Incomplete description/
    )
})

test('malformed, duplicate, unsupported, future, and expired manifests are rejected before deletion', async (t) => {
    const { clients, state, applyOptions } = mockAws(t)
    const plan = await reviewedPlan(clients)
    const invalidPlans = [
        null,
        {},
        { ...plan, version: 2 },
        { ...plan, region: 'us-west-2' },
        { ...plan, minAgeDays: 0 },
        { ...plan, createdAt: new Date(NOW - 2 * DAY_MS).toISOString() },
        { ...plan, createdAt: new Date(NOW + DAY_MS).toISOString() },
        { ...plan, candidates: [plan.candidates[0], plan.candidates[0]] },
        { ...plan, candidates: [null] },
        {
            ...plan,
            candidates: [{ ...plan.candidates[0], modifiedAt: 'invalid' }],
        },
    ]
    for (const value of invalidPlans)
        await assert.rejects(applyCleanupPlan(clients, value, applyOptions))
    assert.deepEqual(state.operations, [])
})

test('changed snapshots, new owners, and newly appearing stage/source stacks prevent deletion', async (t) => {
    for (const change of [
        'tags',
        'users',
        'owner',
        'stage-stack',
        'source-stack',
        'forged-tags',
    ]) {
        const { clients, state, applyOptions } = mockAws(t)
        const pool = state.pools.get('us-east-1_test')!
        const sourceId = `arn:aws:cloudformation:us-east-1:${ACCOUNT_ID}:stack/cognito-orphan-review-cdk/original`
        pool.UserPoolTags!['aws:cloudformation:stack-id'] = sourceId
        const plan = await reviewedPlan(clients)
        if (change === 'tags') pool.UserPoolTags!.Extra = 'changed'
        if (change === 'users') pool.EstimatedNumberOfUsers!++
        if (change === 'forged-tags') pool.UserPoolTags = {}
        if (change === 'owner') {
            state.stacks = [
                {
                    StackId: 'imported',
                    StackName: 'other-stack',
                    StackStatus: 'IMPORT_COMPLETE',
                },
            ]
            state.resources.set('imported', [
                {
                    ResourceType: 'AWS::Cognito::UserPool',
                    PhysicalResourceId: pool.Id,
                },
            ])
        }
        if (change === 'stage-stack')
            state.stackLookups.set(
                'cognito-orphan-review-cdk',
                'CREATE_COMPLETE'
            )
        if (change === 'source-stack')
            state.stackLookups.set(sourceId, 'CREATE_COMPLETE')
        await applyCleanupPlan(clients, plan, applyOptions)
        assert.deepEqual(state.operations, [], change)
        assert.equal(state.audit[0].action, 'skipped')
    }
})

test('only reviewed IDs are deleted; absent and skipped pools do not consume the batch allowance', async (t) => {
    const pools = [
        makeUserPool('absent', 'us-east-1_a'),
        makeUserPool('changed', 'us-east-1_b'),
        makeUserPool('delete', 'us-east-1_c'),
        makeUserPool('later', 'us-east-1_d'),
    ]
    const { clients, state, applyOptions } = mockAws(t, pools)
    const plan = await reviewedPlan(clients)
    state.pools.delete(pools[0].Id!)
    pools[1].EstimatedNumberOfUsers!++
    state.pools.set(
        'us-east-1_extra',
        makeUserPool('unapproved', 'us-east-1_extra')
    )
    await applyCleanupPlan(clients, plan, { ...applyOptions, limit: 1 })
    assert.deepEqual(state.operations, ['pool:us-east-1_c'])
    assert.deepEqual(
        state.audit.map((event) => event.action),
        ['already-absent', 'skipped', 'delete-started', 'pool-delete-requested']
    )
})

test('a reviewed prefix domain is removed and checked before its pool; no-domain pools delete directly', async (t) => {
    for (const withDomain of [false, true]) {
        const pool = makeUserPool()
        if (withDomain) pool.Domain = 'orphan-review-login-client'
        const { clients, state, applyOptions } = mockAws(t, [pool])
        await applyCleanupPlan(
            clients,
            await reviewedPlan(clients),
            applyOptions
        )
        assert.deepEqual(
            state.operations,
            withDomain
                ? [
                      'domain:us-east-1_test',
                      'poll:us-east-1_test',
                      'pool:us-east-1_test',
                  ]
                : ['pool:us-east-1_test']
        )
    }
})

test('domain errors, polling failures, and pool errors stop the batch and audit partial operations', async (t) => {
    for (const failure of [
        'domain-request',
        'poll-timeout',
        'poll-read',
        'pool-request',
    ]) {
        const pool = makeUserPool()
        pool.Domain = 'orphan-review-login-client'
        const { clients, state, applyOptions } = mockAws(t, [
            pool,
            makeUserPool('later', 'us-east-1_z'),
        ])
        const plan = await reviewedPlan(clients)
        if (failure === 'domain-request')
            state.errors.set('DeleteUserPoolDomainCommand', new Error('Failed'))
        if (failure === 'poll-timeout') state.keepDomain = true
        if (failure === 'poll-read')
            state.pollError = awsError('NotAuthorizedException')
        if (failure === 'pool-request')
            state.errors.set('DeleteUserPoolCommand', new Error('Failed'))
        await assert.rejects(applyCleanupPlan(clients, plan, applyOptions))
        assert.ok(!state.operations.includes('pool:us-east-1_z'))
        if (failure !== 'pool-request')
            assert.ok(!state.operations.includes('pool:us-east-1_test'))
        assert.equal(state.audit[state.audit.length - 1].action, 'failed')
        assert.equal(
            state.audit.some(
                (event) => event.action === 'domain-delete-requested'
            ),
            failure !== 'domain-request'
        )
        assert.ok(
            state.operations.filter((op) => op.startsWith('poll:')).length <
                100,
            'Polling must be bounded'
        )
    }
})

test('an audit failure before destruction prevents every mutation', async (t) => {
    const { clients, state, applyOptions } = mockAws(t)
    const plan = await reviewedPlan(clients)
    await assert.rejects(
        applyCleanupPlan(clients, plan, {
            ...applyOptions,
            audit: () => {
                throw new Error('Cannot write audit')
            },
        }),
        /Cannot write audit/
    )
    assert.deepEqual(state.operations, [])
})

test('CLI help/defaults/confirmation are safe and existing audit files are never overwritten', (t) => {
    const cli = fileURLToPath(new URL('../cleanup-cognito.ts', import.meta.url))
    const run = (args: string[]) =>
        spawnSync(process.execPath, ['--import', 'tsx', cli, ...args], {
            encoding: 'utf8',
        })
    assert.equal(run(['--help']).status, 0)
    for (const args of [
        [],
        [
            '--plan',
            'unused',
            '--apply',
            'unused',
            '--dev-account-id',
            ACCOUNT_ID,
        ],
        ['--apply', 'unused', '--dev-account-id', ACCOUNT_ID],
        [
            '--apply',
            'unused',
            '--dev-account-id',
            ACCOUNT_ID,
            '--confirm-delete',
            ACCOUNT_ID,
        ],
    ])
        assert.equal(run(args).status, 1)
    const directory = mkdtempSync(join(tmpdir(), 'cognito-cleanup-test-'))
    t.after(() => rmSync(directory, { recursive: true, force: true }))
    const planPath = join(directory, 'plan.json'),
        auditPath = join(directory, 'audit.jsonl')
    writeFileSync(planPath, '{}')
    writeFileSync(auditPath, 'previous audit', { mode: 0o600 })
    const result = run([
        '--apply',
        planPath,
        '--dev-account-id',
        ACCOUNT_ID,
        '--confirm-delete',
        ACCOUNT_ID,
        '--audit-log',
        auditPath,
    ])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /EEXIST/)
    assert.equal(readFileSync(auditPath, 'utf8'), 'previous audit')
})
