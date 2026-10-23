import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
    handler,
    validateRestoredCluster,
} from '../../postgres/src/backupRestoreValidator'
import type {
    BackupRestoreValidationEvent,
    ValidationClient,
    ValidationConfig,
    ValidationDependencies,
} from '../../postgres/src/backupRestoreValidator'
import type { SecretDict } from '../../postgres/src/types'

const config: ValidationConfig = {
    DB_SECRET_ARN:
        'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-source', // pragma: allowlist secret
    EXPECTED_ACCOUNT_ID: '123456789012',
    RESTORE_CLUSTER_PREFIX: 'restore-',
    SOURCE_CLUSTER_IDENTIFIER: 'production',
    EXPECTED_DATABASE: 'app',
    AWS_REGION: 'us-east-1',
}
const target: BackupRestoreValidationEvent = {
    clusterIdentifier: 'restore-test',
    clusterArn: 'arn:aws:rds:us-east-1:123456789012:cluster:restore-test',
    host: 'restore-test.cluster-abc.us-east-1.rds.amazonaws.com',
    port: 5432,
}
const credentials: SecretDict = {
    engine: 'aurora-postgresql',
    host: 'production.cluster-abc.us-east-1.rds.amazonaws.com',
    username: 'postgres',
    password: 'dummy-test-password', // pragma: allowlist secret
    dbname: 'app',
    port: 5432,
}
const success = { finished_at: '2026-01-01', rolled_back_at: null }

function fixture(
    options: {
        migrations?: Record<string, unknown>[]
        state?: boolean
        readOnly?: string
        queryFailure?: boolean
        secret?: SecretDict
        failConnections?: number
        missingPrevious?: boolean
    } = {}
) {
    const queries: string[] = []
    const stages: string[] = []
    const connections: SecretDict[] = []
    let closed = 0
    const client: ValidationClient = {
        async query(sql) {
            queries.push(sql)
            if (options.queryFailure) throw new Error('private database row')
            if (sql === 'SHOW transaction_read_only')
                return {
                    rows: [{ transaction_read_only: options.readOnly ?? 'on' }],
                }
            if (sql.includes('"State"'))
                return { rows: options.state === false ? [] : [{ exists: 1 }] }
            if (sql.includes('"_prisma_migrations"'))
                return { rows: options.migrations ?? [success] }
            return { rows: [] }
        },
        async end() {
            closed++
        },
    }
    const dependencies: ValidationDependencies = {
        async getSecretDict(arn, stage) {
            assert.equal(arn, config.DB_SECRET_ARN)
            stages.push(stage)
            if (stage === 'AWSPREVIOUS' && options.missingPrevious)
                throw new Error('missing previous')
            return options.secret ?? credentials
        },
        async connect(secret) {
            connections.push(secret)
            return connections.length <= (options.failConnections ?? 0)
                ? null
                : client
        },
    }
    return { dependencies, queries, stages, connections, closed: () => closed }
}

void test('rejects invalid target, source, account, ARN, host and port before secrets', async () => {
    const invalid: Partial<BackupRestoreValidationEvent>[] = [
        { clusterIdentifier: 'production' },
        { clusterIdentifier: 'restore-' },
        { clusterIdentifier: 'restore-unsafe/target' },
        {
            clusterArn: target.clusterArn.replace(
                '123456789012',
                '999999999999'
            ),
        },
        { clusterArn: `${target.clusterArn}:extra` },
        { host: credentials.host },
        { host: `${target.host}.evil.example` },
        { host: 'restore-other.cluster-abc.us-east-1.rds.amazonaws.com' },
        { host: target.host.replace('us-east-1', 'us-west-2') },
        { port: 5433 },
    ]
    for (const patch of invalid) {
        const f = fixture()
        await assert.rejects(
            validateRestoredCluster(
                { ...target, ...patch },
                config,
                f.dependencies
            )
        )
        assert.deepEqual(f.stages, [])
    }
    const f = fixture()
    await assert.rejects(
        validateRestoredCluster(
            target,
            { ...config, SOURCE_CLUSTER_IDENTIFIER: target.clusterIdentifier },
            f.dependencies
        )
    )
    assert.deepEqual(f.stages, [])
})

void test('uses read-only transaction, permits admin and empty contracts, closes connection', async () => {
    const f = fixture()
    const result = await validateRestoredCluster(target, config, f.dependencies)
    assert.equal(result.appliedMigrationCount, 1)
    assert.equal(result.checks.length, 4)
    assert.deepEqual(f.queries, [
        'BEGIN READ ONLY',
        "SET LOCAL statement_timeout = '10s'",
        'SHOW transaction_read_only',
        'SELECT 1 FROM public."State" LIMIT 1',
        'SELECT finished_at, rolled_back_at FROM public."_prisma_migrations"',
        'SELECT id FROM public."ContractTable" LIMIT 1',
        'ROLLBACK',
    ])
    assert.deepEqual(f.connections, [
        { ...credentials, host: target.host, port: target.port },
    ])
    assert.deepEqual(f.stages, ['AWSCURRENT'])
    assert.equal(f.closed(), 1)
})

void test('ignores resolved rolled-back attempts alongside a successful migration', async () => {
    const f = fixture({
        migrations: [
            { finished_at: null, rolled_back_at: '2026-01-01' },
            success,
        ],
    })
    assert.equal(
        (await validateRestoredCluster(target, config, f.dependencies))
            .appliedMigrationCount,
        1
    )
    assert.equal(f.closed(), 1)
})

void test('fails unfinished migrations, no successful migrations, empty State, writable transaction and SQL errors; always closes', async () => {
    for (const options of [
        { migrations: [success, { finished_at: null, rolled_back_at: null }] },
        { migrations: [] },
        { migrations: [{ finished_at: null, rolled_back_at: '2026-01-01' }] },
        { state: false },
        { readOnly: 'off' },
        { queryFailure: true },
    ]) {
        const f = fixture(options)
        await assert.rejects(
            validateRestoredCluster(target, config, f.dependencies)
        )
        assert.equal(f.closed(), 1)
        assert.deepEqual(f.stages, ['AWSCURRENT'])
    }
})

void test('retries only AWSPREVIOUS after null connection, always with restored host', async () => {
    const f = fixture({ failConnections: 1 })
    await validateRestoredCluster(target, config, f.dependencies)
    assert.deepEqual(f.stages, ['AWSCURRENT', 'AWSPREVIOUS'])
    assert.equal(f.connections.length, 2)
    assert.ok(
        f.connections.every((c) => c.host === target.host && c.port === 5432)
    )
    assert.equal(f.closed(), 1)
    for (const options of [
        { failConnections: 2 },
        { failConnections: 1, missingPrevious: true },
    ]) {
        const failed = fixture(options)
        await assert.rejects(
            validateRestoredCluster(target, config, failed.dependencies)
        )
        assert.deepEqual(failed.stages, ['AWSCURRENT', 'AWSPREVIOUS'])
        assert.ok(failed.connections.length <= 2)
    }
})

void test('rejects source host or wrong database without connecting or falling back', async () => {
    for (const secret of [
        { ...credentials, host: target.host },
        { ...credentials, dbname: 'wrong' },
        { ...credentials, dbname: undefined },
    ]) {
        const f = fixture({ secret })
        await assert.rejects(
            validateRestoredCluster(target, config, f.dependencies)
        )
        assert.deepEqual(f.connections, [])
        assert.deepEqual(f.stages, ['AWSCURRENT'])
    }
})

void test('handler sanitizes failures and ignores caller-supplied secret fields', async () => {
    const response = await handler({ ...target, clusterArn: 'invalid' })
    assert.equal(response.statusCode, 500)
    assert.deepEqual(JSON.parse(response.body), {
        message: 'Restored cluster validation failed',
    })
})
