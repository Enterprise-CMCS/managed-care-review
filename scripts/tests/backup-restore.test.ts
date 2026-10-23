import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { STSClient } from '@aws-sdk/client-sts'
import {
    CreateDBInstanceCommand,
    RestoreDBClusterToPointInTimeCommand,
    type DBCluster,
    type Tag,
} from '@aws-sdk/client-rds'
import {
    BACKUP_TEST_PURPOSE,
    MAX_RECOVERY_POINT_AGE_MS,
    backupRestoreConfig,
    isBackupTestStage,
} from '../backup-restore-config'
import { githubBackupCredentials } from '../backup-restore-credentials'
import {
    assertOwnedTarget,
    checkBackupHealth,
    cleanupRestore,
    testDatabaseBackupRestore,
    validateSource,
    type BackupServices,
} from '../test-aurora-automated-backup-restore'

// Mocked restores must not write a real GitHub job summary claiming a live pass.
const originalSummary = process.env.GITHUB_STEP_SUMMARY
before(() => {
    delete process.env.GITHUB_STEP_SUMMARY
})
after(() => {
    if (originalSummary === undefined) delete process.env.GITHUB_STEP_SUMMARY
    else process.env.GITHUB_STEP_SUMMARY = originalSummary
})
const config = backupRestoreConfig('prod', '123456789012')
type Call = { name: string; input: Record<string, unknown> }
function source(): DBCluster {
    return {
        DBClusterIdentifier: config.sourceIdentifier,
        DBClusterArn: config.sourceArn,
        Engine: 'aurora-postgresql',
        BackupRetentionPeriod: 30,
        LatestRestorableTime: new Date(Date.now() - 120000),
        EarliestRestorableTime: new Date(Date.now() - 29 * 86400000),
        DBSubnetGroup: 'private-dev',
        DBClusterParameterGroup: 'default.aurora-postgresql16',
        ServerlessV2ScalingConfiguration: { MinCapacity: 1, MaxCapacity: 2 },
    }
}
function fixture(
    options: {
        validationFailure?: boolean
        foreignTags?: boolean
        lostResponse?: boolean
        oldHeartbeat?: boolean
        orphan?: boolean
        writerState?: string
    } = {}
) {
    const calls: Call[] = []
    let restore: Record<string, unknown> | undefined
    let writer = false
    const arn = (id: string, type = 'cluster') =>
        `arn:aws:rds:${config.region}:${config.account}:${type}:${id}`
    const send = async (command: {
        constructor: { name: string }
        input: Record<string, unknown>
    }) => {
        const name = command.constructor.name
        const input = command.input
        calls.push({ name, input })
        switch (name) {
            case 'DescribeStacksCommand':
                return {
                    Stacks: [
                        {
                            Outputs: [
                                {
                                    OutputKey: 'BackupRestoreRoleArn',
                                    OutputValue: config.roleArn,
                                },
                                {
                                    OutputKey:
                                        'BackupRestoreExpectedRetentionDays',
                                    OutputValue: '30',
                                },
                                {
                                    OutputKey: 'BackupRestoreSecurityGroupId',
                                    OutputValue: 'sg-safe',
                                },
                                {
                                    OutputKey:
                                        'BackupRestoreValidatorFunctionName',
                                    OutputValue:
                                        'postgres-prod-backupRestoreValidator-cdk',
                                },
                            ],
                        },
                    ],
                }
            case 'DescribeDBClustersCommand': {
                if (!input.DBClusterIdentifier)
                    return {
                        DBClusters: options.orphan
                            ? [
                                  {
                                      DBClusterIdentifier: `${config.clusterPrefix}old`,
                                      DBClusterArn: arn(
                                          `${config.clusterPrefix}old`
                                      ),
                                      ClusterCreateTime: new Date(
                                          Date.now() - 86400000
                                      ),
                                  },
                              ]
                            : [],
                    }
                if (input.DBClusterIdentifier === config.sourceIdentifier)
                    return { DBClusters: [source()] }
                if (!restore)
                    throw Object.assign(new Error('not found'), {
                        name: 'DBClusterNotFoundFault',
                    })
                const id = String(restore.DBClusterIdentifier)
                return {
                    DBClusters: [
                        {
                            DBClusterIdentifier: id,
                            DBClusterArn: arn(id),
                            Endpoint: `${id}.cluster-test.us-east-1.rds.amazonaws.com`,
                            Port: 5432,
                            Status: 'available',
                            VpcSecurityGroups: [
                                { VpcSecurityGroupId: 'sg-safe' },
                            ],
                        },
                    ],
                }
            }
            case 'RestoreDBClusterToPointInTimeCommand':
                restore = input
                if (options.lostResponse)
                    throw new Error('lost response after create')
                return {}
            case 'CreateDBInstanceCommand':
                writer = true
                return {}
            case 'DescribeDBInstancesCommand': {
                if (!writer || !restore)
                    throw Object.assign(new Error('not found'), {
                        name: 'DBInstanceNotFoundFault',
                    })
                const id = `${restore.DBClusterIdentifier}-writer`
                return {
                    DBInstances: [
                        {
                            DBInstanceIdentifier: id,
                            DBInstanceArn: arn(id, 'db'),
                            DBClusterIdentifier: restore.DBClusterIdentifier,
                            DBInstanceStatus:
                                options.writerState ?? 'available',
                        },
                    ],
                }
            }
            case 'ListTagsForResourceCommand': {
                const resourceTags = restore?.Tags as Tag[] | undefined
                return {
                    TagList:
                        options.orphan && !restore
                            ? [
                                  {
                                      Key: 'Purpose',
                                      Value: BACKUP_TEST_PURPOSE,
                                  },
                                  {
                                      Key: 'RestoreTestOwner',
                                      Value: config.stage,
                                  },
                              ]
                            : resourceTags?.map((tag) =>
                                  options.foreignTags &&
                                  tag.Key === 'RestoreTestRun'
                                      ? { ...tag, Value: 'another-run' }
                                      : tag
                              ),
                }
            }
            case 'DeleteDBInstanceCommand':
                writer = false
                return {}
            case 'DeleteDBClusterCommand':
                restore = undefined
                return {}
            case 'InvokeCommand':
                return {
                    Payload: new TextEncoder().encode(
                        JSON.stringify({
                            statusCode: options.validationFailure ? 500 : 200,
                            body: JSON.stringify({
                                checks: [
                                    'State',
                                    'migrations',
                                    'ContractTable',
                                ],
                            }),
                        })
                    ),
                }
            case 'PutParameterCommand':
                return {}
            case 'GetParameterCommand':
                return {
                    Parameter: {
                        Value: JSON.stringify({
                            completedAt: new Date(
                                Date.now() -
                                    (options.oldHeartbeat
                                        ? 36 * 86400000
                                        : 86400000)
                            ).toISOString(),
                            sourceArn: config.sourceArn,
                        }),
                    },
                }
            default:
                throw new Error(`Unexpected mocked command: ${name}`)
        }
    }
    const services = {
        rds: { send },
        cloudformation: { send },
        lambda: { send },
        ssm: { send },
    } as unknown as BackupServices
    return { services, calls }
}

void test('prod source is fixed; review source is dev and official non-prod stages are refused', () => {
    assert.equal(config.sourceIdentifier, 'postgres-prod-cluster-cdk')
    assert.equal(
        backupRestoreConfig('review123', config.account).sourceIdentifier,
        'postgres-dev-cluster-cdk'
    )
    for (const stage of [
        'dev',
        'val',
        'qa',
        'main',
        'local',
        '../prod',
        'a',
        'trailing-',
        'double--dash',
    ])
        assert.throws(() => backupRestoreConfig(stage, config.account))
    assert.equal(backupRestoreConfig('ab', config.account).sourceStage, 'dev')
    assert.equal(
        backupRestoreConfig('feature-x', config.account).sourceStage,
        'dev'
    )
    assert.equal(isBackupTestStage('main'), false)
    assert.equal(isBackupTestStage('local'), false)
    assert.equal(isBackupTestStage('ab'), true)
    assert.throws(() => backupRestoreConfig('prod', 'not-an-account'))
    assert.ok(
        `${backupRestoreConfig('abcdefghijklmnopqrstuvw', config.account).clusterPrefix}${'a'.repeat(20)}-writer`
            .length <= 63
    )
})
void test('freshness is checked before restoring, including future/disabled/wrong-source cases', () => {
    assert.ok(validateSource(config, source(), 30))
    for (const override of [
        {
            LatestRestorableTime: new Date(
                Date.now() - MAX_RECOVERY_POINT_AGE_MS - 1000
            ),
        },
        { LatestRestorableTime: new Date(Date.now() + 3600000) },
        { BackupRetentionPeriod: 0 },
        {
            DBClusterArn: config.sourceArn.replace(
                config.account,
                '999999999999'
            ),
        },
    ])
        assert.throws(() =>
            validateSource(config, { ...source(), ...override }, 30)
        )
})
void test('successful run restores a separate private copy and records success ONLY after cleanup', async () => {
    const f = fixture()
    await testDatabaseBackupRestore(config, f.services)
    const restored = f.calls.find(
        (call) => call.name === 'RestoreDBClusterToPointInTimeCommand'
    )
    assert.ok(restored)
    assert.equal(
        restored.input.SourceDBClusterIdentifier,
        config.sourceIdentifier
    )
    assert.notEqual(restored.input.DBClusterIdentifier, config.sourceIdentifier)
    assert.ok(restored.input.RestoreToTime instanceof Date)
    assert.deepEqual(restored.input.VpcSecurityGroupIds, ['sg-safe'])
    assert.equal(
        f.calls.find((call) => call.name === 'CreateDBInstanceCommand')?.input
            .PubliclyAccessible,
        false
    )
    const deletion = f.calls.findIndex(
        (call) => call.name === 'DeleteDBClusterCommand'
    )
    const success = f.calls.findIndex(
        (call) => call.name === 'PutParameterCommand'
    )
    assert.ok(deletion > 0 && success > deletion)
    assert.equal(f.calls[success].input.Name, config.parameterName)
    for (const call of f.calls.filter((call) => call.name.startsWith('Delete')))
        assert.notEqual(call.input.DBClusterIdentifier, config.sourceIdentifier)
})
void test('SQL failure still cleans up and never advances last-success', async () => {
    const f = fixture({ validationFailure: true })
    await assert.rejects(
        testDatabaseBackupRestore(config, f.services),
        /SQL validation failed/
    )
    assert.ok(f.calls.some((call) => call.name === 'DeleteDBClusterCommand'))
    assert.equal(
        f.calls.some((call) => call.name === 'PutParameterCommand'),
        false
    )
})
void test('an ambiguous restore response can clean up only resources bearing this exact run token', async () => {
    const f = fixture({ lostResponse: true })
    await assert.rejects(
        testDatabaseBackupRestore(config, f.services),
        /lost response/
    )
    assert.ok(f.calls.some((call) => call.name === 'DeleteDBClusterCommand'))
    assert.equal(
        f.calls.some((call) => call.name === 'PutParameterCommand'),
        false
    )
})
for (const writerState of [
    'failed',
    'incompatible-restore',
    'incompatible-network',
]) {
    void test(`cleanup deletes a writer in ${writerState} state without waiting for availability`, async () => {
        const f = fixture({ writerState })
        const id = `${config.clusterPrefix}failed-copy`
        const runId = 'failed-copy-run'
        await f.services.rds.send(
            new RestoreDBClusterToPointInTimeCommand({
                DBClusterIdentifier: id,
                SourceDBClusterIdentifier: config.sourceIdentifier,
                Tags: [
                    { Key: 'Purpose', Value: BACKUP_TEST_PURPOSE },
                    { Key: 'RestoreTestOwner', Value: config.stage },
                    { Key: 'RestoreTestRun', Value: runId },
                    {
                        Key: 'RestoreTestSource',
                        Value: config.sourceIdentifier,
                    },
                ],
            })
        )
        await f.services.rds.send(
            new CreateDBInstanceCommand({
                DBClusterIdentifier: id,
                DBInstanceIdentifier: `${id}-writer`,
                DBInstanceClass: 'db.serverless',
                Engine: 'aurora-postgresql',
            })
        )
        await cleanupRestore(
            config,
            f.services.rds,
            id,
            runId,
            Date.now() + 600000
        )
        assert.ok(
            f.calls.some((call) => call.name === 'DeleteDBInstanceCommand')
        )
        assert.ok(
            f.calls.some((call) => call.name === 'DeleteDBClusterCommand')
        )
        assert.equal(
            f.calls.some((call) => call.name === 'PutParameterCommand'),
            false
        )
    })
}
void test('foreign ownership refuses deletion and success, even if a resource has the right name prefix', async () => {
    const f = fixture({ foreignTags: true })
    await assert.rejects(
        testDatabaseBackupRestore(config, f.services),
        /cleanup failed/
    )
    assert.equal(
        f.calls.some((call) => call.name.startsWith('Delete')),
        false
    )
    assert.equal(
        f.calls.some((call) => call.name === 'PutParameterCommand'),
        false
    )
})
void test('cleanup refuses production source before making any SDK call', async () => {
    const f = fixture()
    await assert.rejects(
        cleanupRestore(
            config,
            f.services.rds,
            config.sourceIdentifier,
            'run',
            Date.now() + 60000
        ),
        /Refusing cleanup/
    )
    assert.equal(f.calls.length, 0)
    assert.throws(() =>
        assertOwnedTarget(
            config,
            config.sourceIdentifier,
            config.sourceArn,
            [],
            'run',
            'cluster'
        )
    )
})
void test('daily check detects a missed monthly run and stranded owned copies without mutations', async () => {
    const healthy = fixture()
    await checkBackupHealth(config, healthy.services)
    for (const options of [{ oldHeartbeat: true }, { orphan: true }]) {
        const f = fixture(options)
        await assert.rejects(checkBackupHealth(config, f.services))
        assert.equal(
            f.calls.some((call) =>
                /^(Create|Delete|Put|Restore)/.test(call.name)
            ),
            false
        )
    }
})
void test('OIDC credentials can be renewed, use only the exact test role, and restrict health sessions to reads', async () => {
    const keys = [
        'GITHUB_ACTIONS',
        'ACTIONS_ID_TOKEN_REQUEST_URL',
        'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
    ] as const
    const saved = keys.map((key) => process.env[key])
    process.env.GITHUB_ACTIONS = 'true'
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL =
        'https://example.actions.githubusercontent.com/token'
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = 'test-request-token' // pragma: allowlist secret
    const assumed: Record<string, unknown>[] = []
    let fetched = 0
    try {
        const provider = githubBackupCredentials(config, true, {
            fetch: (async () => {
                fetched++
                return new Response(
                    JSON.stringify({ value: 'test-oidc-value' })
                )
            }) as typeof fetch,
            sts: {
                send: async (command: { input: Record<string, unknown> }) => {
                    assumed.push(command.input)
                    return {
                        Credentials: {
                            AccessKeyId: 'test-access-key',
                            SecretAccessKey: 'dummy-secret-key', // pragma: allowlist secret — dummy test credential
                            SessionToken: 'dummy-session-token', // pragma: allowlist secret — dummy test credential
                            Expiration: new Date(Date.now() + 3600000),
                        },
                    }
                },
            } as unknown as Pick<STSClient, 'send'>,
        })
        assert.ok((await provider()).expiration)
        assert.ok((await provider()).expiration)
        assert.equal(fetched, 2)
        assert.equal(assumed[0].RoleArn, config.roleArn)
        assert.ok(String(assumed[0].Policy).includes('ssm:GetParameter'))
        assert.equal(
            /Delete|Create|PutParameter|InvokeFunction/.test(
                String(assumed[0].Policy)
            ),
            false
        )
        delete process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
        await assert.rejects(
            provider(),
            /no local\/deployment credential fallback/
        )
        assert.equal(assumed.length, 2)
    } finally {
        keys.forEach((key, i) => {
            if (saved[i] === undefined) delete process.env[key]
            else process.env[key] = saved[i]
        })
    }
})
