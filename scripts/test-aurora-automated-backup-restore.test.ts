import { vi } from 'vitest'

// Mocking the SDK modules exercises the script's orchestration without AWS;
// the scheduled workflow remains responsible for integration coverage.
const mocks = vi.hoisted(() => {
    const makeCommand = (commandName: string) =>
        class {
            readonly commandName = commandName
            constructor(readonly input: Record<string, unknown> = {}) {}
        }

    return {
        makeCommand,
        rdsSend: vi.fn(),
        ssmSend: vi.fn(),
        lambdaSend: vi.fn(),
        cloudFormationSend: vi.fn(),
        cloudFrontSend: vi.fn(),
        waitUntilDBClusterAvailable: vi.fn(),
        waitUntilDBClusterDeleted: vi.fn(),
        waitUntilDBInstanceAvailable: vi.fn(),
        waitUntilDBInstanceDeleted: vi.fn(),
    }
})

vi.mock('@aws-sdk/client-rds', () => ({
    RDSClient: class {
        send = mocks.rdsSend
    },
    DescribeDBClustersCommand: mocks.makeCommand('DescribeDBClusters'),
    RestoreDBClusterToPointInTimeCommand: mocks.makeCommand(
        'RestoreDBClusterToPointInTime'
    ),
    CreateDBInstanceCommand: mocks.makeCommand('CreateDBInstance'),
    DeleteDBClusterCommand: mocks.makeCommand('DeleteDBCluster'),
    DeleteDBInstanceCommand: mocks.makeCommand('DeleteDBInstance'),
    waitUntilDBClusterAvailable: mocks.waitUntilDBClusterAvailable,
    waitUntilDBClusterDeleted: mocks.waitUntilDBClusterDeleted,
    waitUntilDBInstanceAvailable: mocks.waitUntilDBInstanceAvailable,
    waitUntilDBInstanceDeleted: mocks.waitUntilDBInstanceDeleted,
}))

vi.mock('@aws-sdk/client-ssm', () => ({
    SSMClient: class {
        send = mocks.ssmSend
    },
    GetParameterCommand: mocks.makeCommand('GetParameter'),
    PutParameterCommand: mocks.makeCommand('PutParameter'),
}))

vi.mock('@aws-sdk/client-lambda', () => ({
    LambdaClient: class {
        send = mocks.lambdaSend
    },
    InvokeCommand: mocks.makeCommand('Invoke'),
}))

vi.mock('@aws-sdk/client-cloudformation', () => ({
    CloudFormationClient: class {
        send = mocks.cloudFormationSend
    },
    DescribeStacksCommand: mocks.makeCommand('DescribeStacks'),
}))

vi.mock('@aws-sdk/client-cloudfront', () => ({
    CloudFrontClient: class {
        send = mocks.cloudFrontSend
    },
    ListDistributionsCommand: mocks.makeCommand('ListDistributions'),
}))

const { testDatabaseBackupRestore } =
    await import('./test-aurora-automated-backup-restore')

type FakeCommand = { commandName: string; input: Record<string, unknown> }

const SOURCE_CLUSTER_ID = 'postgres-dev-cluster-cdk'
const SOURCE_CLUSTER = {
    DBClusterIdentifier: SOURCE_CLUSTER_ID,
    BackupRetentionPeriod: 7,
    EarliestRestorableTime: new Date('2026-08-01T00:00:00Z'),
    LatestRestorableTime: new Date('2026-09-01T00:00:00Z'),
    VpcSecurityGroups: [{ VpcSecurityGroupId: 'sg-1' }],
    DBSubnetGroup: 'subnet-group',
    DBClusterParameterGroup: 'param-group',
    Engine: 'aurora-postgresql',
}
// A migration directory that really exists, so checkMigrations passes.
const KNOWN_MIGRATION = '20210913202047_init'

const validatorBody = (tableCounts: Record<string, number>) => ({
    tableCount: Object.keys(tableCounts).length,
    rowCount: Object.values(tableCounts).reduce((sum, n) => sum + n, 0),
    tableCounts,
    appliedMigrations: [KNOWN_MIGRATION],
})

type Scenario = {
    sourceCluster: Record<string, unknown>
    staleClusters: Record<string, unknown>[]
    storedBaseline: string | undefined
    validatorPayload: unknown
    deleteClusterError: Error | undefined
}

let scenario: Scenario

const commandsSentTo = (send: typeof mocks.rdsSend): string[] =>
    send.mock.calls.map(([command]) => (command as FakeCommand).commandName)

const namedError = (name: string, message = name): Error => {
    const error = new Error(message)
    error.name = name
    return error
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    scenario = {
        sourceCluster: { ...SOURCE_CLUSTER },
        staleClusters: [],
        storedBaseline: undefined,
        validatorPayload: {
            statusCode: 200,
            body: JSON.stringify(validatorBody({ ContractTable: 1000 })),
        },
        deleteClusterError: undefined,
    }

    mocks.rdsSend.mockImplementation(async (command: FakeCommand) => {
        const clusterId = command.input.DBClusterIdentifier as
            string | undefined

        switch (command.commandName) {
            case 'DescribeDBClusters':
                // No identifier means the stale-cluster sweep is listing.
                if (!clusterId) return { DBClusters: scenario.staleClusters }
                if (clusterId === SOURCE_CLUSTER_ID) {
                    return { DBClusters: [scenario.sourceCluster] }
                }
                return {
                    DBClusters: [
                        {
                            DBClusterIdentifier: clusterId,
                            Endpoint: 'restored.example.com',
                            Port: 5432,
                        },
                    ],
                }
            case 'DeleteDBCluster':
                if (scenario.deleteClusterError)
                    throw scenario.deleteClusterError
                return {}
            default:
                return {}
        }
    })

    mocks.ssmSend.mockImplementation(async (command: FakeCommand) => {
        if (command.commandName === 'GetParameter') {
            if (scenario.storedBaseline === undefined) {
                throw namedError('ParameterNotFound')
            }
            return { Parameter: { Value: scenario.storedBaseline } }
        }

        return {}
    })

    mocks.lambdaSend.mockImplementation(async () => ({
        Payload: new TextEncoder().encode(
            JSON.stringify(scenario.validatorPayload)
        ),
    }))

    mocks.cloudFormationSend.mockImplementation(async () => ({
        Stacks: [
            {
                Outputs: [
                    {
                        OutputKey: 'PostgresSecretArn',
                        OutputValue: 'arn:aws:secret',
                    },
                    {
                        OutputKey: 'BackupRestoreValidatorFunctionName',
                        OutputValue: 'validator-fn',
                    },
                ],
            },
        ],
    }))

    mocks.cloudFrontSend.mockImplementation(async () => ({
        DistributionList: {
            Items: [{ Aliases: { Items: ['mc-review-dev.onemac.cms.gov'] } }],
        },
    }))
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('testDatabaseBackupRestore', () => {
    const putParameterPayloads = () =>
        mocks.ssmSend.mock.calls
            .map(([command]) => command as FakeCommand)
            .filter((command) => command.commandName === 'PutParameter')
            .map((command) => JSON.parse(command.input.Value as string))

    test('completes, records a baseline, and cleans up', async () => {
        await expect(testDatabaseBackupRestore('dev')).resolves.toBeUndefined()

        expect(putParameterPayloads()).toEqual([
            {
                version: 1,
                tableCounts: { ContractTable: 1000 },
                shrinkageWarnings: [],
            },
        ])
        expect(commandsSentTo(mocks.rdsSend)).toContain('DeleteDBCluster')
        expect(mocks.ssmSend.mock.calls[0][0].input).toEqual({
            Name: '/mcr/dev/backup-restore-test/table-counts',
        })

        const restoreCommand = mocks.rdsSend.mock.calls
            .map(([command]) => command as FakeCommand)
            .find(
                (command) =>
                    command.commandName === 'RestoreDBClusterToPointInTime'
            )
        expect(restoreCommand?.input.Tags).toEqual([
            { Key: 'Project', Value: 'Managed Care Review' },
            { Key: 'Environment', Value: 'dev' },
            { Key: 'ManagedBy', Value: 'BackupRestoreTest' },
            { Key: 'Service', Value: 'postgres' },
            { Key: 'Purpose', Value: 'backup-restore-test' },
        ])
    })

    test('refuses to restore when automated backups are disabled', async () => {
        scenario.sourceCluster.BackupRetentionPeriod = 0

        await expect(testDatabaseBackupRestore('dev')).rejects.toThrow(
            'has automated backups disabled'
        )
        expect(commandsSentTo(mocks.rdsSend)).not.toContain(
            'RestoreDBClusterToPointInTime'
        )
    })

    test('stops when the credentials are for another environment', async () => {
        await expect(testDatabaseBackupRestore('prod')).rejects.toThrow(
            'AWS credentials do not appear to be for prod'
        )
        expect(mocks.rdsSend).not.toHaveBeenCalled()
    })

    test.each([
        [
            'an unknown migration',
            {
                statusCode: 200,
                body: JSON.stringify({
                    ...validatorBody({ ContractTable: 1000 }),
                    appliedMigrations: ['29990101000000_from_the_future'],
                }),
            },
            /29990101000000_from_the_future/,
        ],
        [
            'a validator error',
            {
                statusCode: 500,
                body: JSON.stringify({ message: 'connection refused' }),
            },
            /Backup restore validator failed/,
        ],
    ])('still cleans up after %s', async (_label, payload, error) => {
        scenario.validatorPayload = payload

        await expect(testDatabaseBackupRestore('dev')).rejects.toThrow(error)
        expect(commandsSentTo(mocks.rdsSend)).toContain('DeleteDBCluster')
    })

    test('surfaces a cleanup failure when the test itself passed', async () => {
        scenario.deleteClusterError = namedError(
            'InvalidDBClusterStateFault',
            'still settling'
        )

        await expect(testDatabaseBackupRestore('dev')).rejects.toThrow(
            'Could not delete restored cluster'
        )
    })

    test('keeps the original failure when cleanup also fails', async () => {
        scenario.validatorPayload = {
            statusCode: 200,
            body: JSON.stringify({
                ...validatorBody({ ContractTable: 1000 }),
                appliedMigrations: ['29990101000000_from_the_future'],
            }),
        }
        scenario.deleteClusterError = namedError('InvalidDBClusterStateFault')

        // The cleanup error must not mask why the test failed.
        await expect(testDatabaseBackupRestore('dev')).rejects.toThrow(
            /29990101000000_from_the_future/
        )
    })

    test('warns on first shrinkage and preserves the accepted count', async () => {
        scenario.storedBaseline = JSON.stringify({ Warned: 1000, Healthy: 100 })
        scenario.validatorPayload = {
            statusCode: 200,
            body: JSON.stringify(
                validatorBody({ Warned: 700, Healthy: 95, NewTable: 5 })
            ),
        }

        await expect(testDatabaseBackupRestore('dev')).resolves.toBeUndefined()
        expect(console.warn).toHaveBeenCalledWith(
            'Backup data discrepancy: Warned: shrank from 1000 to 700'
        )
        expect(putParameterPayloads()).toEqual([
            {
                version: 1,
                tableCounts: { Warned: 1000, Healthy: 95, NewTable: 5 },
                shrinkageWarnings: ['Warned'],
            },
        ])
    })

    test('fails recurring shrinkage without replacing the accepted count', async () => {
        scenario.storedBaseline = JSON.stringify({
            version: 1,
            tableCounts: { ContractTable: 1000 },
            shrinkageWarnings: ['ContractTable'],
        })
        scenario.validatorPayload = {
            statusCode: 200,
            body: JSON.stringify(validatorBody({ ContractTable: 700 })),
        }

        await expect(testDatabaseBackupRestore('dev')).rejects.toThrow(
            'persistent table shrinkage: ContractTable: shrank from 1000 to 700'
        )
        expect(putParameterPayloads()).toEqual([])
    })

    test('clears a warning after recovery to the tolerance boundary', async () => {
        scenario.storedBaseline = JSON.stringify({
            version: 1,
            tableCounts: { ContractTable: 1000 },
            shrinkageWarnings: ['ContractTable'],
        })
        scenario.validatorPayload = {
            statusCode: 200,
            body: JSON.stringify(validatorBody({ ContractTable: 900 })),
        }

        await expect(testDatabaseBackupRestore('dev')).resolves.toBeUndefined()
        expect(putParameterPayloads()).toEqual([
            {
                version: 1,
                tableCounts: { ContractTable: 900 },
                shrinkageWarnings: [],
            },
        ])
    })

    test.each([
        [{}, 'ContractTable: missing from restore'],
        [{ ContractTable: 0 }, 'ContractTable: emptied (was 1000)'],
    ])(
        'fails immediately on missing or empty data',
        async (tableCounts, error) => {
            scenario.storedBaseline = JSON.stringify({ ContractTable: 1000 })
            scenario.validatorPayload = {
                statusCode: 200,
                body: JSON.stringify(validatorBody(tableCounts)),
            }

            await expect(testDatabaseBackupRestore('dev')).rejects.toThrow(
                error
            )
            expect(putParameterPayloads()).toEqual([])
        }
    )

    test('rejects malformed baseline state without overwriting it', async () => {
        scenario.storedBaseline = JSON.stringify({
            version: 1,
            tableCounts: { ContractTable: 1000 },
            shrinkageWarnings: ['UnknownTable'],
        })

        await expect(testDatabaseBackupRestore('dev')).rejects.toThrow(
            'Invalid backup restore baseline'
        )
        expect(putParameterPayloads()).toEqual([])
    })

    test('sweeps stale clusters but leaves recent ones alone', async () => {
        scenario.staleClusters = [
            {
                DBClusterIdentifier: 'mcr-backup-restore-dev-old',
                ClusterCreateTime: new Date(Date.now() - 12 * 60 * 60 * 1000),
            },
            {
                DBClusterIdentifier: 'mcr-backup-restore-dev-recent',
                ClusterCreateTime: new Date(Date.now() - 60 * 1000),
            },
        ]

        await testDatabaseBackupRestore('dev')

        const deleted = mocks.rdsSend.mock.calls
            .map(([command]) => command as FakeCommand)
            .filter((command) => command.commandName === 'DeleteDBCluster')
            .map((command) => command.input.DBClusterIdentifier)

        expect(deleted).toContain('mcr-backup-restore-dev-old')
        expect(deleted).not.toContain('mcr-backup-restore-dev-recent')
    })
})
