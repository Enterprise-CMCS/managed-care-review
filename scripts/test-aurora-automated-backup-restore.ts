// Adapted from PR #4715: native Aurora PITR, not AWS Backup enrollment.
import {
    CloudFormationClient,
    DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import {
    CreateDBInstanceCommand,
    DeleteDBClusterCommand,
    DeleteDBInstanceCommand,
    DescribeDBClustersCommand,
    DescribeDBInstancesCommand,
    ListTagsForResourceCommand,
    RestoreDBClusterToPointInTimeCommand,
    RDSClient,
    waitUntilDBClusterAvailable,
    waitUntilDBClusterDeleted,
    waitUntilDBInstanceAvailable,
    waitUntilDBInstanceDeleted,
    type DBCluster,
    type Tag,
} from '@aws-sdk/client-rds'
import {
    GetParameterCommand,
    PutParameterCommand,
    SSMClient,
} from '@aws-sdk/client-ssm'
import { randomUUID } from 'node:crypto'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import {
    BACKUP_TEST_PURPOSE,
    CLEANUP_BUDGET_SECONDS,
    MAIN_BUDGET_SECONDS,
    MAX_RECOVERY_POINT_AGE_MS,
    MAX_SUCCESS_AGE_MS,
    ORPHAN_AGE_MS,
    backupRestoreConfig,
    type BackupRestoreConfig,
} from './backup-restore-config'
import { githubBackupCredentials } from './backup-restore-credentials'

export interface BackupServices {
    rds: RDSClient
    cloudformation: CloudFormationClient
    lambda: LambdaClient
    ssm: SSMClient
}

function isMissing(error: unknown, name: string): boolean {
    return error instanceof Error && error.name === name
}
async function describeCluster(rds: RDSClient, identifier: string) {
    try {
        return (
            await rds.send(
                new DescribeDBClustersCommand({
                    DBClusterIdentifier: identifier,
                })
            )
        ).DBClusters?.[0]
    } catch (error) {
        if (isMissing(error, 'DBClusterNotFoundFault')) return undefined
        throw error
    }
}
async function instance(rds: RDSClient, identifier: string) {
    try {
        return (
            await rds.send(
                new DescribeDBInstancesCommand({
                    DBInstanceIdentifier: identifier,
                })
            )
        ).DBInstances?.[0]
    } catch (error) {
        if (isMissing(error, 'DBInstanceNotFoundFault')) return undefined
        throw error
    }
}
async function stackOutputs(
    config: BackupRestoreConfig,
    services: BackupServices
) {
    const result = await services.cloudformation.send(
        new DescribeStacksCommand({ StackName: config.stackName })
    )
    const outputs = result.Stacks?.[0]?.Outputs ?? []
    const get = (key: string) => {
        const value = outputs.find(
            (output) => output.OutputKey === key
        )?.OutputValue
        if (!value)
            throw new Error(
                `Missing ${key} on ${config.stackName}; deploy test infrastructure first`
            )
        return value
    }
    if (get('BackupRestoreRoleArn') !== config.roleArn)
        throw new Error('Unexpected test role')
    const retention = Number(get('BackupRestoreExpectedRetentionDays'))
    const securityGroup = get('BackupRestoreSecurityGroupId')
    const functionName = get('BackupRestoreValidatorFunctionName')
    if (
        !Number.isInteger(retention) ||
        retention < 1 ||
        !/^sg-[a-zA-Z0-9]+$/.test(securityGroup) ||
        functionName !== `postgres-${config.stage}-backupRestoreValidator-cdk`
    ) {
        throw new Error('Invalid test infrastructure outputs')
    }
    return { retention, securityGroup, functionName }
}
export function validateSource(
    config: BackupRestoreConfig,
    source: DBCluster | undefined,
    retention: number,
    now = Date.now()
): Date {
    if (
        !source ||
        source.DBClusterArn !== config.sourceArn ||
        source.DBClusterIdentifier !== config.sourceIdentifier ||
        source.Engine !== 'aurora-postgresql'
    ) {
        throw new Error('Source is not the expected Aurora cluster/account')
    }
    const latest = source.LatestRestorableTime
    const earliest = source.EarliestRestorableTime
    if (
        (source.BackupRetentionPeriod ?? 0) < retention ||
        !latest ||
        !earliest ||
        earliest > latest ||
        !Number.isFinite(latest.getTime()) ||
        !Number.isFinite(earliest.getTime()) ||
        latest.getTime() > now + 60000 ||
        now - latest.getTime() > MAX_RECOVERY_POINT_AGE_MS
    ) {
        throw new Error('Source backup retention/window/freshness check failed')
    }
    return latest
}

const tagValue = (tags: Tag[], key: string) =>
    tags.find((tag) => tag.Key === key)?.Value
async function tags(rds: RDSClient, arn: string) {
    return (
        (await rds.send(new ListTagsForResourceCommand({ ResourceName: arn })))
            .TagList ?? []
    )
}
export function assertOwnedTarget(
    config: BackupRestoreConfig,
    identifier: string,
    arn: string,
    resourceTags: Tag[],
    runId: string,
    resource: 'cluster' | 'db'
) {
    const expectedArn = `arn:aws:rds:${config.region}:${config.account}:${resource}:${identifier}`
    if (
        !/^[a-z][a-z0-9-]{0,62}$/.test(identifier) ||
        !identifier.startsWith(config.clusterPrefix) ||
        identifier === config.sourceIdentifier ||
        arn !== expectedArn ||
        tagValue(resourceTags, 'Purpose') !== BACKUP_TEST_PURPOSE ||
        tagValue(resourceTags, 'RestoreTestOwner') !== config.stage ||
        tagValue(resourceTags, 'RestoreTestRun') !== runId ||
        tagValue(resourceTags, 'RestoreTestSource') !== config.sourceIdentifier
    ) {
        throw new Error('Refusing unowned or source cleanup target')
    }
}
function remaining(deadline: number) {
    const seconds = Math.floor((deadline - Date.now()) / 1000)
    if (seconds < 60)
        throw new Error(
            'Time budget exhausted; inspect the named test resources'
        )
    return { maxWaitTime: seconds, minDelay: 15, maxDelay: 30 }
}

/** No account-wide sweep: delete only this run's exact, verified cluster/instance. */
export async function cleanupRestore(
    config: BackupRestoreConfig,
    rds: RDSClient,
    clusterId: string,
    runId: string,
    deadline: number
) {
    if (
        !/^[a-z][a-z0-9-]{0,62}$/.test(clusterId) ||
        !clusterId.startsWith(config.clusterPrefix) ||
        clusterId === config.sourceIdentifier
    ) {
        throw new Error('Refusing cleanup outside this test namespace')
    }
    const cluster = await describeCluster(rds, clusterId)
    if (!cluster) return
    assertOwnedTarget(
        config,
        clusterId,
        cluster.DBClusterArn ?? '',
        await tags(rds, cluster.DBClusterArn ?? ''),
        runId,
        'cluster'
    )
    // Ask RDS to delete directly: failed/incompatible restores may be deletable
    // but will NEVER satisfy an "available" waiter. Retry only transitional-state
    // rejections, rechecking ownership before each attempt within one budget.
    const requestDelete = async (
        action: () => Promise<void>,
        transitionalErrors: string[]
    ) => {
        for (;;) {
            remaining(deadline)
            try {
                await action()
                return
            } catch (error) {
                if (
                    !(error instanceof Error) ||
                    !transitionalErrors.includes(error.name)
                )
                    throw error
                await delay(15000)
            }
        }
    }
    const instanceId = `${clusterId}-writer`
    await requestDelete(async () => {
        const writer = await instance(rds, instanceId)
        if (!writer) return
        assertOwnedTarget(
            config,
            instanceId,
            writer.DBInstanceArn ?? '',
            await tags(rds, writer.DBInstanceArn ?? ''),
            runId,
            'db'
        )
        if (writer.DBClusterIdentifier !== clusterId)
            throw new Error(
                'Refusing cleanup of an instance attached to another cluster'
            )
        if (writer.DBInstanceStatus !== 'deleting')
            await rds.send(
                new DeleteDBInstanceCommand({
                    DBInstanceIdentifier: instanceId,
                    SkipFinalSnapshot: true,
                })
            )
    }, ['InvalidDBInstanceStateFault', 'InvalidDBInstanceState'])
    await waitUntilDBInstanceDeleted(
        { client: rds, ...remaining(deadline) },
        { DBInstanceIdentifier: instanceId }
    )
    await requestDelete(async () => {
        const current = await describeCluster(rds, clusterId)
        if (!current) return
        assertOwnedTarget(
            config,
            clusterId,
            current.DBClusterArn ?? '',
            await tags(rds, current.DBClusterArn ?? ''),
            runId,
            'cluster'
        )
        if (current.Status !== 'deleting')
            await rds.send(
                new DeleteDBClusterCommand({
                    DBClusterIdentifier: clusterId,
                    SkipFinalSnapshot: true,
                })
            )
    }, ['InvalidDBClusterStateFault', 'InvalidDBClusterState'])
    await waitUntilDBClusterDeleted(
        { client: rds, ...remaining(deadline) },
        { DBClusterIdentifier: clusterId }
    )
}

function summary(text: string) {
    if (process.env.GITHUB_STEP_SUMMARY)
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`)
}
export async function testDatabaseBackupRestore(
    config: BackupRestoreConfig,
    services: BackupServices,
    signal?: AbortSignal
) {
    const started = Date.now()
    const mainDeadline = started + MAIN_BUDGET_SECONDS * 1000
    const overallDeadline = mainDeadline + CLEANUP_BUDGET_SECONDS * 1000
    const outputs = await stackOutputs(config, services)
    let source = await describeCluster(services.rds, config.sourceIdentifier)
    if (config.stage !== 'prod') {
        // Review CI has just created/migrated its logical DB and login. Wait for
        // PITR to include that deployment, rather than declaring an older copy bad.
        const catchupDeadline = Math.min(mainDeadline, started + 10 * 60 * 1000)
        while (
            validateSource(config, source, outputs.retention).getTime() <
            started
        ) {
            if (Date.now() >= catchupDeadline)
                throw new Error(
                    'Dev recovery point has not caught up to the review deployment within 10 minutes'
                )
            await delay(15000, undefined, { signal })
            source = await describeCluster(
                services.rds,
                config.sourceIdentifier
            )
        }
    }
    const restorePoint = validateSource(config, source, outputs.retention)
    if (!source?.DBSubnetGroup) throw new Error('Source has no DB subnet group')
    const runId = randomUUID()
    const clusterId = `${config.clusterPrefix}${runId.replaceAll('-', '').slice(0, 20)}`
    const instanceId = `${clusterId}-writer`
    if (instanceId.length > 63)
        throw new Error('Invalid generated instance identifier')
    const resourceTags: Tag[] = [
        { Key: 'Project', Value: 'Managed Care Review' },
        { Key: 'Environment', Value: config.sourceStage },
        { Key: 'ManagedBy', Value: 'BackupRestoreTest' },
        { Key: 'Service', Value: 'postgres' },
        { Key: 'Purpose', Value: BACKUP_TEST_PURPOSE },
        { Key: 'RestoreTestOwner', Value: config.stage },
        { Key: 'RestoreTestRun', Value: runId },
        { Key: 'RestoreTestSource', Value: config.sourceIdentifier },
        ...(config.sourceStage === 'prod'
            ? [{ Key: 'CostCenter', Value: 'MCR-Production' }]
            : []),
    ]
    summary(
        `## Native Aurora backup test\nSource: \`${config.sourceIdentifier}\`\nRestore point: ${restorePoint.toISOString()}\nTemporary cluster: \`${clusterId}\`\nRun ownership tag: \`${runId}\``
    )
    let attempted = false
    let failure: unknown
    let checks: string[] = []
    try {
        attempted = true
        await services.rds.send(
            new RestoreDBClusterToPointInTimeCommand({
                DBClusterIdentifier: clusterId,
                SourceDBClusterIdentifier: config.sourceIdentifier,
                RestoreToTime: restorePoint,
                DBSubnetGroupName: source.DBSubnetGroup,
                DBClusterParameterGroupName: source.DBClusterParameterGroup,
                VpcSecurityGroupIds: [outputs.securityGroup],
                ServerlessV2ScalingConfiguration:
                    source.ServerlessV2ScalingConfiguration ?? {
                        MinCapacity: 1,
                        MaxCapacity: 2,
                    },
                DeletionProtection: false,
                Tags: resourceTags,
            }),
            { abortSignal: signal }
        )
        await waitUntilDBClusterAvailable(
            {
                client: services.rds,
                ...remaining(mainDeadline),
                abortSignal: signal,
            },
            { DBClusterIdentifier: clusterId }
        )
        await services.rds.send(
            new CreateDBInstanceCommand({
                DBClusterIdentifier: clusterId,
                DBInstanceIdentifier: instanceId,
                Engine: 'aurora-postgresql',
                DBInstanceClass: 'db.serverless',
                PubliclyAccessible: false,
                Tags: resourceTags,
            }),
            { abortSignal: signal }
        )
        await waitUntilDBInstanceAvailable(
            {
                client: services.rds,
                ...remaining(mainDeadline),
                abortSignal: signal,
            },
            { DBInstanceIdentifier: instanceId }
        )
        const restored = await describeCluster(services.rds, clusterId)
        if (
            !restored?.Endpoint ||
            restored.VpcSecurityGroups?.length !== 1 ||
            restored.VpcSecurityGroups[0].VpcSecurityGroupId !==
                outputs.securityGroup
        )
            throw new Error('Restored endpoint/network verification failed')
        assertOwnedTarget(
            config,
            clusterId,
            restored.DBClusterArn ?? '',
            await tags(services.rds, restored.DBClusterArn ?? ''),
            runId,
            'cluster'
        )
        const result = await services.lambda.send(
            new InvokeCommand({
                FunctionName: outputs.functionName,
                Payload: JSON.stringify({
                    clusterIdentifier: clusterId,
                    clusterArn: restored.DBClusterArn,
                    host: restored.Endpoint,
                    port: restored.Port,
                }),
            }),
            { abortSignal: signal }
        )
        const response = JSON.parse(
            Buffer.from(result.Payload ?? []).toString()
        ) as { statusCode?: number; body?: string }
        if (result.FunctionError || response.statusCode !== 200)
            throw new Error(
                'Restored database SQL validation failed; inspect validator logs'
            )
        const body = JSON.parse(response.body ?? '{}') as { checks?: unknown }
        if (
            !Array.isArray(body.checks) ||
            !body.checks.length ||
            !body.checks.every((check) => typeof check === 'string')
        )
            throw new Error('Invalid SQL validation result')
        checks = body.checks
    } catch (error) {
        failure = error
    } finally {
        if (attempted) {
            try {
                await cleanupRestore(
                    config,
                    services.rds,
                    clusterId,
                    runId,
                    Math.min(
                        overallDeadline,
                        Date.now() + CLEANUP_BUDGET_SECONDS * 1000
                    )
                )
            } catch (error) {
                summary(
                    `**Cleanup failed.** Inspect the exact temporary cluster \`${clusterId}\` and its run tag; do not sweep by prefix.`
                )
                throw new AggregateError(
                    failure ? [failure, error] : [error],
                    `Backup-test cleanup failed for ${clusterId}`
                )
            }
        }
    }
    if (failure) throw failure
    if (config.stage === 'prod') {
        await services.ssm.send(
            new PutParameterCommand({
                Name: config.parameterName,
                Type: 'String',
                Overwrite: true,
                Value: JSON.stringify({
                    completedAt: new Date().toISOString(),
                    restorePoint: restorePoint.toISOString(),
                    sourceArn: config.sourceArn,
                }),
            })
        )
    }
    summary(
        `**Passed: restore, SQL validation, and cleanup.**\nChecks: ${checks.join(', ')}\nTotal test duration: ${Math.round((Date.now() - started) / 60000)} minutes (not application recovery RTO).`
    )
    console.info('Aurora backup restore test passed, including cleanup')
}

/** A separate daily workflow checks monthly completion and leaks without deleting anything. */
export async function checkBackupHealth(
    config: BackupRestoreConfig,
    services: BackupServices
) {
    if (config.stage !== 'prod')
        throw new Error('Scheduled health checks are production-only')
    const outputs = await stackOutputs(config, services)
    validateSource(
        config,
        await describeCluster(services.rds, config.sourceIdentifier),
        outputs.retention
    )
    let marker: string | undefined
    do {
        const page = await services.rds.send(
            new DescribeDBClustersCommand({ Marker: marker })
        )
        for (const cluster of page.DBClusters ?? []) {
            if (
                cluster.DBClusterIdentifier?.startsWith(config.clusterPrefix) &&
                cluster.DBClusterArn &&
                cluster.ClusterCreateTime &&
                Date.now() - cluster.ClusterCreateTime.getTime() > ORPHAN_AGE_MS
            ) {
                const resourceTags = await tags(
                    services.rds,
                    cluster.DBClusterArn
                )
                if (
                    tagValue(resourceTags, 'Purpose') === BACKUP_TEST_PURPOSE &&
                    tagValue(resourceTags, 'RestoreTestOwner') === config.stage
                ) {
                    throw new Error(
                        `Stranded backup-test cluster: ${cluster.DBClusterIdentifier}; inspect ownership before manual cleanup`
                    )
                }
            }
        }
        marker = page.Marker
    } while (marker)
    let result
    try {
        result = await services.ssm.send(
            new GetParameterCommand({ Name: config.parameterName })
        )
    } catch (error) {
        if (isMissing(error, 'ParameterNotFound'))
            throw new Error(
                'No successful production restore recorded; run a manual production test after deployment'
            )
        throw error
    }
    const last = JSON.parse(result.Parameter?.Value ?? '{}') as {
        completedAt?: string
        sourceArn?: string
    }
    const completed = new Date(last.completedAt ?? '').getTime()
    if (
        !Number.isFinite(completed) ||
        completed > Date.now() + 60000 ||
        Date.now() - completed > MAX_SUCCESS_AGE_MS ||
        last.sourceArn !== config.sourceArn
    ) {
        throw new Error(
            'No successful production restore + cleanup recorded within 35 days'
        )
    }
    console.info(
        'Backup freshness, retention, last successful test, and orphan checks passed'
    )
}

async function main() {
    const args = process.argv.slice(2)
    const index = args.indexOf('--stage')
    if (
        index < 0 ||
        !args[index + 1] ||
        args.length !== (args.includes('--check') ? 3 : 2)
    )
        throw new Error(
            'Usage: tsx test-aurora-automated-backup-restore.ts --stage prod|<review-stage> [--check]'
        )
    const config = backupRestoreConfig(
        args[index + 1],
        process.env.BACKUP_TEST_ACCOUNT_ID ?? ''
    )
    const credentials = githubBackupCredentials(
        config,
        args.includes('--check')
    )
    const common = {
        region: config.region,
        credentials,
        maxAttempts: 3,
        requestHandler: { requestTimeout: 30000 },
    }
    const services: BackupServices = {
        rds: new RDSClient(common),
        cloudformation: new CloudFormationClient(common),
        ssm: new SSMClient(common),
        lambda: new LambdaClient({
            ...common,
            maxAttempts: 1,
            requestHandler: { requestTimeout: 90000 },
        }),
    }
    const controller = new AbortController()
    const cancel = () => controller.abort()
    process.once('SIGTERM', cancel)
    process.once('SIGINT', cancel)
    try {
        if (args.includes('--check')) await checkBackupHealth(config, services)
        else
            await testDatabaseBackupRestore(config, services, controller.signal)
    } finally {
        process.removeListener('SIGTERM', cancel)
        process.removeListener('SIGINT', cancel)
    }
}
if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    void main().catch((error: unknown) => {
        console.error(error)
        process.exitCode = 1
    })
}
