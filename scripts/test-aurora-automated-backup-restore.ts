import {
    CloudFormationClient,
    DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation'
import {
    CloudFrontClient,
    ListDistributionsCommand,
} from '@aws-sdk/client-cloudfront'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import {
    CreateDBInstanceCommand,
    DBCluster,
    DeleteDBClusterCommand,
    DeleteDBInstanceCommand,
    DescribeDBClustersCommand,
    RDSClient,
    RestoreDBClusterToPointInTimeCommand,
    Tag,
    waitUntilDBClusterAvailable,
    waitUntilDBClusterDeleted,
    waitUntilDBInstanceAvailable,
    waitUntilDBInstanceDeleted,
} from '@aws-sdk/client-rds'
import {
    GetParameterCommand,
    PutParameterCommand,
    SSMClient,
} from '@aws-sdk/client-ssm'
import { appendFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

type BackupRestoreEnv = 'dev' | 'val' | 'prod'

type ValidatorResponse = {
    statusCode?: number
    body?: string
}

type ValidatorBody = {
    tableCount: number
    rowCount: number
    tableCounts: Record<string, number>
    appliedMigrations: string[]
}

const AWS_REGION = 'us-east-1'
const RESTORED_CLUSTER_PREFIX = 'mcr-backup-restore-'

// A production point-in-time restore can take well over an hour. Timing out mid
// restore leaves a running cluster behind, so allow generous headroom.
const CLUSTER_AVAILABLE_TIMEOUT_SECONDS = 7200
const INSTANCE_AVAILABLE_TIMEOUT_SECONDS = 3600
const DELETE_TIMEOUT_SECONDS = 1800

// Clusters older than this were left behind by a cancelled or crashed run.
const STALE_CLUSTER_AGE_MS = 6 * 60 * 60 * 1000

// Row counts legitimately drop as drafts and join rows are deleted, so only flag
// a table that lost more than this fraction since the previous run.
const SHRINK_TOLERANCE = 0.1

const ACCOUNT_URLS: Record<BackupRestoreEnv, string> = {
    dev: 'mc-review-dev.onemac.cms.gov',
    val: 'mc-review-val.onemac.cms.gov',
    prod: 'mc-review.onemac.cms.gov',
}

const awsConfig = { region: AWS_REGION }
const rds = new RDSClient(awsConfig)
const cloudFormation = new CloudFormationClient(awsConfig)
const cloudFront = new CloudFrontClient(awsConfig)
const ssm = new SSMClient(awsConfig)
// Retrying an in-flight Invoke would run the validator twice against production.
const lambda = new LambdaClient({
    ...awsConfig,
    maxAttempts: 1,
    requestHandler: { requestTimeout: 900000 },
})

function parseArgs(): BackupRestoreEnv {
    const args = process.argv.slice(2)

    if (args.includes('--help')) {
        printUsage()
        process.exit(0)
    }

    const envArg = getArgValue(args, '--env')
    if (!envArg) {
        printUsage()
        process.exit(1)
    }

    if (envArg !== 'dev' && envArg !== 'val' && envArg !== 'prod') {
        throw new Error(`--env must be dev, val, or prod. Got: ${envArg}`)
    }

    return envArg
}

function getArgValue(args: string[], name: string): string | undefined {
    const prefixedArg = args.find((arg) => arg.startsWith(`${name}=`))
    if (prefixedArg) return prefixedArg.split('=')[1]

    const argIndex = args.indexOf(name)
    if (argIndex >= 0) return args[argIndex + 1]

    return undefined
}

function printUsage(): void {
    console.info(`
Usage:
  pnpm --filter scripts build
  node scripts/test-aurora-automated-backup-restore.js --env dev

Options:
  --env dev|val|prod       AWS environment to validate
`)
}

function tempResourceSuffix(envName: BackupRestoreEnv): string {
    const timestamp = new Date()
        .toISOString()
        .replace(/[-:.TZ]/g, '')
        .slice(0, 14)
    const runId = process.env.GITHUB_RUN_ID

    return runId
        ? `${envName}-${runId.slice(-8)}-${timestamp}`
        : `${envName}-${timestamp}`
}

function sourceClusterIdentifier(stage: string): string {
    return `postgres-${stage}-cluster-cdk`
}

function stackName(stage: string): string {
    return `postgres-${stage}-cdk`
}

/**
 * Mirrors the mandatory tags applied by BaseStack so restored clusters stay
 * visible to cost allocation, plus a marker used to identify test resources.
 */
function restoreTags(envName: BackupRestoreEnv): Tag[] {
    const tags: Tag[] = [
        { Key: 'Project', Value: 'Managed Care Review' },
        { Key: 'Environment', Value: envName },
        { Key: 'ManagedBy', Value: 'BackupRestoreTest' },
        { Key: 'Service', Value: 'postgres' },
        { Key: 'Purpose', Value: 'backup-restore-test' },
    ]

    if (envName === 'prod') {
        tags.push({ Key: 'CostCenter', Value: 'MCR-Production' })
    }

    return tags
}

function formatDuration(milliseconds: number): string {
    const totalSeconds = Math.round(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)

    return `${minutes}m ${totalSeconds % 60}s`
}

async function checkAWSAccess(envName: BackupRestoreEnv): Promise<void> {
    const response = await cloudFront.send(new ListDistributionsCommand({}))

    const expectedAlias = ACCOUNT_URLS[envName]
    const found = response.DistributionList?.Items?.some((distribution) =>
        distribution.Aliases?.Items?.includes(expectedAlias)
    )

    if (!found) {
        throw new Error(
            `AWS credentials do not appear to be for ${envName}; did not find CloudFront alias ${expectedAlias}`
        )
    }
}

async function getStackOutput(
    stage: string,
    outputKey: string
): Promise<string> {
    const response = await cloudFormation.send(
        new DescribeStacksCommand({ StackName: stackName(stage) })
    )

    const output = response.Stacks?.[0]?.Outputs?.find(
        (stackOutput) => stackOutput.OutputKey === outputKey
    )?.OutputValue

    if (!output) {
        throw new Error(
            `Could not find ${outputKey} output on stack ${stackName(stage)}`
        )
    }

    return output
}

async function describeCluster(
    clusterIdentifier: string
): Promise<DBCluster | undefined> {
    try {
        const response = await rds.send(
            new DescribeDBClustersCommand({
                DBClusterIdentifier: clusterIdentifier,
            })
        )

        return response.DBClusters?.[0]
    } catch (error) {
        if (error instanceof Error && error.name === 'DBClusterNotFoundFault') {
            return undefined
        }

        throw error
    }
}

async function requireCluster(clusterIdentifier: string): Promise<DBCluster> {
    const cluster = await describeCluster(clusterIdentifier)
    if (!cluster) {
        throw new Error(`Cluster not found: ${clusterIdentifier}`)
    }

    return cluster
}

async function listRestoreTestClusters(): Promise<DBCluster[]> {
    const clusters: DBCluster[] = []
    let marker: string | undefined

    do {
        const response = await rds.send(
            new DescribeDBClustersCommand({ Marker: marker })
        )

        for (const cluster of response.DBClusters ?? []) {
            if (
                cluster.DBClusterIdentifier?.startsWith(RESTORED_CLUSTER_PREFIX)
            ) {
                clusters.push(cluster)
            }
        }

        marker = response.Marker
    } while (marker)

    return clusters
}

/**
 * Deletes clusters left behind by runs that were cancelled before cleanup could
 * run. Without this a cancelled job leaks a full copy of the source database.
 */
async function sweepStaleRestoreClusters(): Promise<void> {
    const clusters = await listRestoreTestClusters()
    const staleBefore = Date.now() - STALE_CLUSTER_AGE_MS

    const staleClusters = clusters.filter(
        (cluster) =>
            cluster.ClusterCreateTime &&
            cluster.ClusterCreateTime.getTime() < staleBefore
    )

    if (staleClusters.length === 0) return

    console.info(
        `Sweeping ${staleClusters.length} stale backup restore cluster(s)`
    )

    for (const cluster of staleClusters) {
        if (!cluster.DBClusterIdentifier) continue

        console.warn(
            `Deleting stale cluster ${cluster.DBClusterIdentifier} created ${cluster.ClusterCreateTime?.toISOString()}`
        )

        // The sweep is a safety net; a failure here should not stop this run's test.
        try {
            await cleanupRestoredCluster(cluster.DBClusterIdentifier)
        } catch (error) {
            console.warn(`Could not sweep stale cluster: ${error}`)
        }
    }
}

async function restoreAutomatedBackup(
    sourceCluster: DBCluster,
    restoredClusterIdentifier: string,
    envName: BackupRestoreEnv
): Promise<void> {
    const securityGroupIds =
        sourceCluster.VpcSecurityGroups?.flatMap((sg) =>
            sg.VpcSecurityGroupId ? [sg.VpcSecurityGroupId] : []
        ) ?? []

    if (securityGroupIds.length === 0) {
        throw new Error(
            `Source cluster ${sourceCluster.DBClusterIdentifier} has no VPC security groups`
        )
    }

    const serverlessConfig = sourceCluster.ServerlessV2ScalingConfiguration
    const tags = restoreTags(envName)

    console.info(
        `Restoring automated backup for ${sourceCluster.DBClusterIdentifier} to latest restorable time ${sourceCluster.LatestRestorableTime?.toISOString()}`
    )

    await rds.send(
        new RestoreDBClusterToPointInTimeCommand({
            DBClusterIdentifier: restoredClusterIdentifier,
            SourceDBClusterIdentifier: sourceCluster.DBClusterIdentifier,
            UseLatestRestorableTime: true,
            DBSubnetGroupName: sourceCluster.DBSubnetGroup,
            VpcSecurityGroupIds: securityGroupIds,
            DBClusterParameterGroupName: sourceCluster.DBClusterParameterGroup,
            ServerlessV2ScalingConfiguration: {
                MinCapacity: serverlessConfig?.MinCapacity ?? 1,
                MaxCapacity: serverlessConfig?.MaxCapacity ?? 16,
            },
            DeletionProtection: false,
            Tags: tags,
        })
    )

    await waitUntilDBClusterAvailable(
        { client: rds, maxWaitTime: CLUSTER_AVAILABLE_TIMEOUT_SECONDS },
        { DBClusterIdentifier: restoredClusterIdentifier }
    )

    await rds.send(
        new CreateDBInstanceCommand({
            DBInstanceIdentifier: `${restoredClusterIdentifier}-instance-1`,
            DBClusterIdentifier: restoredClusterIdentifier,
            Engine: sourceCluster.Engine,
            DBInstanceClass: 'db.serverless',
            PubliclyAccessible: false,
            Tags: tags,
        })
    )

    await waitUntilDBInstanceAvailable(
        { client: rds, maxWaitTime: INSTANCE_AVAILABLE_TIMEOUT_SECONDS },
        { DBInstanceIdentifier: `${restoredClusterIdentifier}-instance-1` }
    )

    await waitUntilDBClusterAvailable(
        { client: rds, maxWaitTime: CLUSTER_AVAILABLE_TIMEOUT_SECONDS },
        { DBClusterIdentifier: restoredClusterIdentifier }
    )
}

async function cleanupRestoredCluster(
    restoredClusterIdentifier: string
): Promise<void> {
    const instanceIdentifier = `${restoredClusterIdentifier}-instance-1`

    try {
        await rds.send(
            new DeleteDBInstanceCommand({
                DBInstanceIdentifier: instanceIdentifier,
                SkipFinalSnapshot: true,
            })
        )

        await waitUntilDBInstanceDeleted(
            { client: rds, maxWaitTime: DELETE_TIMEOUT_SECONDS },
            { DBInstanceIdentifier: instanceIdentifier }
        )
    } catch (error) {
        if (
            !(error instanceof Error) ||
            error.name !== 'DBInstanceNotFoundFault'
        ) {
            console.warn(`Could not delete restored instance: ${error}`)
        }
    }

    try {
        await deleteClusterWithRetry(restoredClusterIdentifier)
    } catch (error) {
        // Leaving a cluster running is a cost and data exposure problem, so fail
        // loudly rather than letting the workflow report success.
        throw new Error(
            `Could not delete restored cluster ${restoredClusterIdentifier}. Delete it manually. Cause: ${error}`
        )
    }
}

/**
 * A cluster still settling after a restore rejects deletion. Wait for it to
 * reach available and try once more before giving up.
 */
async function deleteClusterWithRetry(
    restoredClusterIdentifier: string
): Promise<void> {
    if (!(await describeCluster(restoredClusterIdentifier))) return

    try {
        await deleteCluster(restoredClusterIdentifier)
        return
    } catch (error) {
        if (
            !(error instanceof Error) ||
            error.name !== 'InvalidDBClusterStateFault'
        ) {
            throw error
        }

        console.warn(
            `Cluster ${restoredClusterIdentifier} not ready for deletion, waiting for it to settle`
        )
    }

    await waitUntilDBClusterAvailable(
        { client: rds, maxWaitTime: CLUSTER_AVAILABLE_TIMEOUT_SECONDS },
        { DBClusterIdentifier: restoredClusterIdentifier }
    )
    await deleteCluster(restoredClusterIdentifier)
}

async function deleteCluster(restoredClusterIdentifier: string): Promise<void> {
    await rds.send(
        new DeleteDBClusterCommand({
            DBClusterIdentifier: restoredClusterIdentifier,
            SkipFinalSnapshot: true,
        })
    )

    await waitUntilDBClusterDeleted(
        { client: rds, maxWaitTime: DELETE_TIMEOUT_SECONDS },
        { DBClusterIdentifier: restoredClusterIdentifier }
    )
}

async function invokeBackupRestoreValidator({
    functionName,
    dbSecretArn,
    restoredCluster,
}: {
    functionName: string
    dbSecretArn: string
    restoredCluster: DBCluster
}): Promise<ValidatorBody> {
    if (!restoredCluster.Endpoint) {
        throw new Error(
            `Restored cluster ${restoredCluster.DBClusterIdentifier} has no endpoint`
        )
    }

    const invokeResponse = await lambda.send(
        new InvokeCommand({
            FunctionName: functionName,
            Payload: JSON.stringify({
                dbSecretArn,
                restoredDbHost: restoredCluster.Endpoint,
                restoredDbPort: restoredCluster.Port,
            }),
        })
    )

    const validatorResponse = JSON.parse(
        Buffer.from(invokeResponse.Payload ?? []).toString()
    ) as ValidatorResponse
    const validatorBody =
        validatorResponse.body && JSON.parse(validatorResponse.body)

    if (invokeResponse.FunctionError || validatorResponse.statusCode !== 200) {
        throw new Error(
            `Backup restore validator failed: ${JSON.stringify({
                functionError: invokeResponse.FunctionError,
                validatorResponse: {
                    ...validatorResponse,
                    body: validatorBody ?? validatorResponse.body,
                },
            })}`
        )
    }

    return validatorBody as ValidatorBody
}

/**
 * Confirms every migration in the restored backup is one this repository knows
 * about. Catches restoring the wrong cluster or a corrupted schema without
 * needing to query the live database.
 */
function checkMigrations(appliedMigrations: string[]): void {
    const migrationsDir = join(
        dirname(fileURLToPath(import.meta.url)),
        '..',
        'services',
        'app-api',
        'prisma',
        'migrations'
    )

    const knownMigrations = new Set(
        readdirSync(migrationsDir, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
    )

    const unknown = appliedMigrations.filter(
        (migration) => !knownMigrations.has(migration)
    )

    if (unknown.length > 0) {
        throw new Error(
            `Restored backup contains migrations not present in this repository: ${unknown.join(', ')}`
        )
    }
}

function baselineParameterName(envName: BackupRestoreEnv): string {
    return `/mcr/${envName}/backup-restore-test/table-counts`
}

async function readBaseline(
    envName: BackupRestoreEnv
): Promise<Record<string, number> | undefined> {
    try {
        const response = await ssm.send(
            new GetParameterCommand({ Name: baselineParameterName(envName) })
        )

        return response.Parameter?.Value
            ? (JSON.parse(response.Parameter.Value) as Record<string, number>)
            : undefined
    } catch (error) {
        if (error instanceof Error && error.name === 'ParameterNotFound') {
            return undefined
        }

        throw error
    }
}

async function writeBaseline(
    envName: BackupRestoreEnv,
    tableCounts: Record<string, number>
): Promise<void> {
    await ssm.send(
        new PutParameterCommand({
            Name: baselineParameterName(envName),
            Description:
                'Row counts from the most recent successful Aurora backup restore test',
            Value: JSON.stringify(tableCounts),
            Type: 'String',
            Overwrite: true,
        })
    )
}

/**
 * Compares this restore against the previous one. Backups degrading over time
 * show up as tables that shrink or empty out between runs, which is detectable
 * without ever reading the live database.
 */
function compareToBaseline(
    baseline: Record<string, number>,
    tableCounts: Record<string, number>
): void {
    const problems = Object.entries(baseline).flatMap(
        ([tableName, baselineRows]) => {
            const currentRows = tableCounts[tableName]

            if (currentRows === undefined) {
                return [`${tableName}: missing from restore`]
            }

            if (baselineRows > 0 && currentRows === 0) {
                return [`${tableName}: emptied (was ${baselineRows})`]
            }

            if (currentRows < baselineRows * (1 - SHRINK_TOLERANCE)) {
                return [
                    `${tableName}: shrank from ${baselineRows} to ${currentRows}`,
                ]
            }

            return []
        }
    )

    if (problems.length > 0) {
        throw new Error(
            `Restored backup shrank against the previous run: ${problems.join('; ')}`
        )
    }
}

/**
 * Publishes restore timing and row counts so the recovery time objective is
 * recorded on every run rather than only living in workflow logs.
 */
function writeStepSummary(rows: Array<[string, string]>): void {
    const summaryPath = process.env.GITHUB_STEP_SUMMARY
    if (!summaryPath) return

    const table = [
        '| Measure | Value |',
        '| --- | --- |',
        ...rows.map(([label, value]) => `| ${label} | ${value} |`),
    ].join('\n')

    appendFileSync(
        summaryPath,
        `\n### Aurora backup restore test\n\n${table}\n`
    )
}

export async function testDatabaseBackupRestore(
    envName: BackupRestoreEnv
): Promise<void> {
    await checkAWSAccess(envName)
    await sweepStaleRestoreClusters()

    const clusterIdentifier = sourceClusterIdentifier(envName)
    const restoredClusterIdentifier = `${RESTORED_CLUSTER_PREFIX}${tempResourceSuffix(envName)}`
    let restoreStarted = false
    let testFailed = false

    try {
        const sourceCluster = await requireCluster(clusterIdentifier)
        const dbSecretArn = await getStackOutput(envName, 'PostgresSecretArn')
        const validatorFunctionName = await getStackOutput(
            envName,
            'BackupRestoreValidatorFunctionName'
        )
        const baseline = await readBaseline(envName)

        if ((sourceCluster.BackupRetentionPeriod ?? 0) < 1) {
            throw new Error(
                `Source cluster ${clusterIdentifier} has automated backups disabled`
            )
        }

        const restorePoint = sourceCluster.LatestRestorableTime
        if (!sourceCluster.EarliestRestorableTime || !restorePoint) {
            throw new Error(
                `Source cluster ${clusterIdentifier} does not have a restorable backup window`
            )
        }

        restoreStarted = true
        const restoreStartedAt = Date.now()
        await restoreAutomatedBackup(
            sourceCluster,
            restoredClusterIdentifier,
            envName
        )
        const restoreDuration = Date.now() - restoreStartedAt

        const restoredCluster = await requireCluster(restoredClusterIdentifier)
        const validationStartedAt = Date.now()
        const validatorBody = await invokeBackupRestoreValidator({
            functionName: validatorFunctionName,
            dbSecretArn,
            restoredCluster,
        })
        const validationDuration = Date.now() - validationStartedAt

        checkMigrations(validatorBody.appliedMigrations)

        if (baseline) {
            compareToBaseline(baseline, validatorBody.tableCounts)
        } else {
            console.info(
                'No previous run to compare against; establishing baseline'
            )
        }

        await writeBaseline(envName, validatorBody.tableCounts)

        const { appliedMigrations } = validatorBody
        const newestMigration =
            appliedMigrations[appliedMigrations.length - 1] ?? ''
        console.info(
            `Aurora automated backup restore validation passed: ${validatorBody.tableCount} tables, ${validatorBody.rowCount} rows, newest migration ${newestMigration}`
        )

        writeStepSummary([
            ['Environment', envName],
            ['Source cluster', clusterIdentifier],
            ['Restore point', restorePoint.toISOString()],
            [
                'Recovery point age',
                formatDuration(Date.now() - restorePoint.getTime()),
            ],
            ['Restore time (RTO)', formatDuration(restoreDuration)],
            ['Validation time', formatDuration(validationDuration)],
            ['Tables restored', String(validatorBody.tableCount)],
            ['Rows restored', String(validatorBody.rowCount)],
            ['Newest migration', newestMigration],
            [
                'Compared against previous run',
                baseline ? 'yes' : 'no (baseline established)',
            ],
        ])
    } catch (error) {
        testFailed = true
        throw error
    } finally {
        if (restoreStarted) {
            // Throwing from finally would swallow a validation failure, so surface
            // a cleanup problem only when the test itself passed.
            try {
                await cleanupRestoredCluster(restoredClusterIdentifier)
            } catch (error) {
                if (!testFailed) throw error
                console.error(`${error}`)
            }
        }
    }
}

testDatabaseBackupRestore(parseArgs()).catch((error) => {
    console.error('Aurora automated backup restore validation failed:', error)
    process.exit(1)
})
