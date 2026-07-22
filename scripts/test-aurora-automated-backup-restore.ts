import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

type BackupRestoreEnv = 'dev' | 'val' | 'prod'

type BackupRestoreOptions = {
    envName: BackupRestoreEnv
    skipSourceCompare: boolean
}

type RdsCluster = {
    DBClusterIdentifier: string
    DBSubnetGroup: string
    Engine: string
    Port: number
    BackupRetentionPeriod?: number
    EarliestRestorableTime?: string
    Endpoint?: string
    LatestRestorableTime?: string
    VpcSecurityGroups?: Array<{ VpcSecurityGroupId?: string }>
    ServerlessV2ScalingConfiguration?: {
        MinCapacity?: number
        MaxCapacity?: number
    }
}

type LambdaInvokeResponse = {
    StatusCode?: number
    FunctionError?: string
}

type ValidatorResponse = {
    statusCode?: number
    body?: string
}

const AWS_REGION = 'us-east-1'
const ACCOUNT_URLS: Record<BackupRestoreEnv, string> = {
    dev: 'mc-review-dev.onemac.cms.gov',
    val: 'mc-review-val.onemac.cms.gov',
    prod: 'mc-review.onemac.cms.gov',
}

function parseArgs(): BackupRestoreOptions {
    const args = process.argv.slice(2)
    const envArg = getArgValue(args, '--env')

    if (args.includes('--help')) {
        printUsage()
        process.exit(0)
    }

    if (!envArg) {
        printUsage()
        process.exit(1)
    }

    if (envArg !== 'dev' && envArg !== 'val' && envArg !== 'prod') {
        throw new Error(`--env must be dev, val, or prod. Got: ${envArg}`)
    }

    return {
        envName: envArg,
        skipSourceCompare: args.includes('--skip-source-compare'),
    }
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
  node scripts/test-aurora-automated-backup-restore.js --env dev [options]

Options:
  --env dev|val|prod       AWS environment to validate
  --skip-source-compare    Validate restored backup invariants only
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

function assertCommandSucceeded(
    label: string,
    result: ReturnType<typeof spawnSync>
): void {
    if (result.error) throw result.error

    if (result.status !== 0) {
        const stderr = result.stderr?.toString().trim()
        throw new Error(
            `${label} failed with exit code ${result.status}${stderr ? `: ${stderr}` : ''}`
        )
    }
}

function runAws(args: string[], label: string): string {
    const result = spawnSync('aws', ['--region', AWS_REGION, ...args], {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
    })

    assertCommandSucceeded(label, result)
    return result.stdout.toString().trim()
}

function runAwsJson<T>(args: string[], label: string): T {
    return JSON.parse(runAws([...args, '--output', 'json'], label)) as T
}

function runAwsNoOutput(args: string[], label: string): void {
    const result = spawnSync('aws', ['--region', AWS_REGION, ...args], {
        stdio: 'inherit',
    })

    assertCommandSucceeded(label, result)
}

function runAwsText(args: string[], label: string): string {
    return runAws([...args, '--output', 'text'], label)
}

function sourceClusterIdentifier(stage: string): string {
    return `postgres-${stage}-cluster-cdk`
}

function stackName(stage: string): string {
    return `postgres-${stage}-cdk`
}

function checkAWSAccess(envName: BackupRestoreEnv): void {
    const response = runAwsJson<{
        DistributionList?: {
            Items?: Array<{ Aliases?: { Items?: string[] } }>
        }
    }>(['cloudfront', 'list-distributions'], 'check AWS account')

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

function getStackOutput(stage: string, outputKey: string): string {
    const output = runAwsText(
        [
            'cloudformation',
            'describe-stacks',
            '--stack-name',
            stackName(stage),
            '--query',
            `Stacks[0].Outputs[?OutputKey==\`${outputKey}\`].OutputValue`,
        ],
        `read ${outputKey} stack output`
    ).trim()

    if (!output || output === 'None') {
        throw new Error(
            `Could not find ${outputKey} output on stack ${stackName(stage)}`
        )
    }

    return output
}

function describeCluster(clusterIdentifier: string): RdsCluster {
    const response = runAwsJson<{ DBClusters: RdsCluster[] }>(
        [
            'rds',
            'describe-db-clusters',
            '--db-cluster-identifier',
            clusterIdentifier,
        ],
        `describe cluster ${clusterIdentifier}`
    )

    const cluster = response.DBClusters[0]
    if (!cluster) {
        throw new Error(`Cluster not found: ${clusterIdentifier}`)
    }

    return cluster
}

function restoreAutomatedBackup(
    sourceCluster: RdsCluster,
    restoredClusterIdentifier: string
): void {
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
    const minCapacity = serverlessConfig?.MinCapacity ?? 1
    const maxCapacity = serverlessConfig?.MaxCapacity ?? 16

    if ((sourceCluster.BackupRetentionPeriod ?? 0) < 1) {
        throw new Error(
            `Source cluster ${sourceCluster.DBClusterIdentifier} has automated backups disabled`
        )
    }

    if (
        !sourceCluster.EarliestRestorableTime ||
        !sourceCluster.LatestRestorableTime
    ) {
        throw new Error(
            `Source cluster ${sourceCluster.DBClusterIdentifier} does not have a restorable backup window`
        )
    }

    console.info(
        `Restoring automated backup for ${sourceCluster.DBClusterIdentifier} to latest restorable time ${sourceCluster.LatestRestorableTime}`
    )
    runAwsNoOutput(
        [
            'rds',
            'restore-db-cluster-to-point-in-time',
            '--db-cluster-identifier',
            restoredClusterIdentifier,
            '--source-db-cluster-identifier',
            sourceCluster.DBClusterIdentifier,
            '--use-latest-restorable-time',
            '--db-subnet-group-name',
            sourceCluster.DBSubnetGroup,
            '--vpc-security-group-ids',
            ...securityGroupIds,
            '--serverless-v2-scaling-configuration',
            `MinCapacity=${minCapacity},MaxCapacity=${maxCapacity}`,
            '--no-deletion-protection',
        ],
        `restore automated backup for ${sourceCluster.DBClusterIdentifier}`
    )

    runAwsNoOutput(
        [
            'rds',
            'wait',
            'db-cluster-available',
            '--db-cluster-identifier',
            restoredClusterIdentifier,
        ],
        `wait for restored cluster ${restoredClusterIdentifier}`
    )

    runAwsNoOutput(
        [
            'rds',
            'create-db-instance',
            '--db-instance-identifier',
            `${restoredClusterIdentifier}-instance-1`,
            '--db-cluster-identifier',
            restoredClusterIdentifier,
            '--engine',
            sourceCluster.Engine,
            '--db-instance-class',
            'db.serverless',
            '--no-publicly-accessible',
        ],
        `create writer instance for ${restoredClusterIdentifier}`
    )

    runAwsNoOutput(
        [
            'rds',
            'wait',
            'db-instance-available',
            '--db-instance-identifier',
            `${restoredClusterIdentifier}-instance-1`,
        ],
        `wait for writer instance ${restoredClusterIdentifier}`
    )

    runAwsNoOutput(
        [
            'rds',
            'wait',
            'db-cluster-available',
            '--db-cluster-identifier',
            restoredClusterIdentifier,
        ],
        `wait for restored cluster ${restoredClusterIdentifier}`
    )
}

function cleanupRestoredCluster(restoredClusterIdentifier: string): void {
    const instanceIdentifier = `${restoredClusterIdentifier}-instance-1`

    try {
        runAwsNoOutput(
            [
                'rds',
                'delete-db-instance',
                '--db-instance-identifier',
                instanceIdentifier,
                '--skip-final-snapshot',
            ],
            `delete restored instance ${instanceIdentifier}`
        )

        runAwsNoOutput(
            [
                'rds',
                'wait',
                'db-instance-deleted',
                '--db-instance-identifier',
                instanceIdentifier,
            ],
            `wait for restored instance deletion ${instanceIdentifier}`
        )
    } catch (error) {
        console.warn(`Could not delete restored instance: ${error}`)
    }

    try {
        runAwsNoOutput(
            [
                'rds',
                'delete-db-cluster',
                '--db-cluster-identifier',
                restoredClusterIdentifier,
                '--skip-final-snapshot',
            ],
            `delete restored cluster ${restoredClusterIdentifier}`
        )

        runAwsNoOutput(
            [
                'rds',
                'wait',
                'db-cluster-deleted',
                '--db-cluster-identifier',
                restoredClusterIdentifier,
            ],
            `wait for restored cluster deletion ${restoredClusterIdentifier}`
        )
    } catch (error) {
        console.warn(`Could not delete restored cluster: ${error}`)
    }
}

function invokeBackupRestoreValidator({
    functionName,
    sourceDbSecretArn,
    restoredCluster,
    skipSourceCompare,
}: {
    functionName: string
    sourceDbSecretArn: string
    restoredCluster: RdsCluster
    skipSourceCompare: boolean
}): void {
    if (!restoredCluster.Endpoint) {
        throw new Error(
            `Restored cluster ${restoredCluster.DBClusterIdentifier} has no endpoint`
        )
    }

    const tempDir = mkdtempSync(join(tmpdir(), 'mcr-backup-restore-'))
    const responsePath = join(tempDir, 'lambda-response.json')

    try {
        const payload = JSON.stringify({
            sourceDbSecretArn,
            restoredDbHost: restoredCluster.Endpoint,
            restoredDbPort: restoredCluster.Port,
            skipSourceCompare,
        })

        const invokeResponse = runAwsJson<LambdaInvokeResponse>(
            [
                'lambda',
                'invoke',
                '--function-name',
                functionName,
                '--cli-binary-format',
                'raw-in-base64-out',
                '--payload',
                payload,
                responsePath,
            ],
            `invoke ${functionName}`
        )

        const validatorResponse = JSON.parse(
            readFileSync(responsePath, 'utf-8')
        ) as ValidatorResponse
        const validatorBody =
            validatorResponse.body && JSON.parse(validatorResponse.body)

        if (
            invokeResponse.FunctionError ||
            invokeResponse.StatusCode !== 200 ||
            validatorResponse.statusCode !== 200
        ) {
            throw new Error(
                `Backup restore validator failed: ${JSON.stringify({
                    invokeResponse,
                    validatorResponse: {
                        ...validatorResponse,
                        body: validatorBody ?? validatorResponse.body,
                    },
                })}`
            )
        }

        console.info(
            `Aurora automated backup restore validation passed: ${JSON.stringify(validatorBody)}`
        )
    } finally {
        rmSync(tempDir, { recursive: true, force: true })
    }
}

export async function testDatabaseBackupRestore({
    envName,
    skipSourceCompare,
}: BackupRestoreOptions): Promise<void> {
    checkAWSAccess(envName)

    const clusterIdentifier = sourceClusterIdentifier(envName)
    const suffix = tempResourceSuffix(envName)
    const restoredClusterIdentifier = `mcr-backup-restore-${suffix}`
    let restoreStarted = false

    try {
        const sourceCluster = describeCluster(clusterIdentifier)
        const sourceDbSecretArn = getStackOutput(envName, 'PostgresSecretArn')
        const validatorFunctionName = getStackOutput(
            envName,
            'BackupRestoreValidatorFunctionName'
        )

        restoreStarted = true
        restoreAutomatedBackup(sourceCluster, restoredClusterIdentifier)

        const restoredCluster = describeCluster(restoredClusterIdentifier)
        invokeBackupRestoreValidator({
            functionName: validatorFunctionName,
            sourceDbSecretArn,
            restoredCluster,
            skipSourceCompare,
        })
    } finally {
        if (restoreStarted) {
            cleanupRestoredCluster(restoredClusterIdentifier)
        }
    }
}

testDatabaseBackupRestore(parseArgs()).catch((error) => {
    console.error('Aurora automated backup restore validation failed:', error)
    process.exit(1)
})
