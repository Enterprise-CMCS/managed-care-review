import {
    CloudFormationClient,
    ListStackResourcesCommand,
    ListStacksCommand,
    StackStatus,
} from '@aws-sdk/client-cloudformation'
import { LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda'

const ACTIVE_STACK_STATUSES = [
    StackStatus.CREATE_COMPLETE,
    StackStatus.CREATE_FAILED,
    StackStatus.CREATE_IN_PROGRESS,
    StackStatus.DELETE_FAILED,
    StackStatus.IMPORT_COMPLETE,
    StackStatus.IMPORT_IN_PROGRESS,
    StackStatus.IMPORT_ROLLBACK_COMPLETE,
    StackStatus.IMPORT_ROLLBACK_FAILED,
    StackStatus.IMPORT_ROLLBACK_IN_PROGRESS,
    StackStatus.REVIEW_IN_PROGRESS,
    StackStatus.ROLLBACK_COMPLETE,
    StackStatus.ROLLBACK_FAILED,
    StackStatus.ROLLBACK_IN_PROGRESS,
    StackStatus.UPDATE_COMPLETE,
    StackStatus.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS,
    StackStatus.UPDATE_FAILED,
    StackStatus.UPDATE_IN_PROGRESS,
    StackStatus.UPDATE_ROLLBACK_COMPLETE,
    StackStatus.UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS,
    StackStatus.UPDATE_ROLLBACK_FAILED,
    StackStatus.UPDATE_ROLLBACK_IN_PROGRESS,
]

type CloudFormationLambda = {
    stackName: string
    logicalId: string
}

type OldNodeLambda = {
    functionName: string
    runtime: string
    managedBy: 'CloudFormation' | 'Unmanaged'
    stackName: string
    logicalId: string
    functionArn: string
}

function getArgValue(name: string): string | undefined {
    const prefixedArg = process.argv.find((arg) => arg.startsWith(`${name}=`))
    if (prefixedArg) return prefixedArg.split('=')[1]

    const argIndex = process.argv.indexOf(name)
    if (argIndex >= 0) return process.argv[argIndex + 1]

    return undefined
}

function printUsage(): void {
    console.info(`
Usage:
  pnpm exec tsx scripts/find-old-node-lambdas.ts [--region us-east-1]

Environment:
  AWS_PROFILE and AWS_REGION are respected by the AWS SDK.
`)
}

function getRegion(): string {
    return getArgValue('--region') ?? process.env.AWS_REGION ?? 'us-east-1'
}

function getNodeMajorVersion(runtime?: string): number | undefined {
    const match = runtime?.match(/^nodejs(\d+)\.x$/)
    if (!match) return undefined

    return Number(match[1])
}

function normalizeLambdaName(physicalResourceId: string): string {
    const arnParts = physicalResourceId.split(':function:')
    return arnParts[1] ?? physicalResourceId
}

async function listActiveStackNames(
    cloudFormationClient: CloudFormationClient
): Promise<string[]> {
    const stackNames: string[] = []
    let nextToken: string | undefined

    do {
        const response = await cloudFormationClient.send(
            new ListStacksCommand({
                NextToken: nextToken,
                StackStatusFilter: ACTIVE_STACK_STATUSES,
            })
        )

        for (const summary of response.StackSummaries ?? []) {
            if (summary.StackName) stackNames.push(summary.StackName)
        }

        nextToken = response.NextToken
    } while (nextToken)

    return stackNames
}

async function listCloudFormationLambdas(
    cloudFormationClient: CloudFormationClient,
    stackName: string
): Promise<Map<string, CloudFormationLambda>> {
    const lambdas = new Map<string, CloudFormationLambda>()
    let nextToken: string | undefined

    do {
        const response = await cloudFormationClient.send(
            new ListStackResourcesCommand({
                StackName: stackName,
                NextToken: nextToken,
            })
        )

        for (const resource of response.StackResourceSummaries ?? []) {
            if (
                resource.ResourceType === 'AWS::Lambda::Function' &&
                resource.PhysicalResourceId
            ) {
                lambdas.set(normalizeLambdaName(resource.PhysicalResourceId), {
                    stackName,
                    logicalId: resource.LogicalResourceId ?? '',
                })
            }
        }

        nextToken = response.NextToken
    } while (nextToken)

    return lambdas
}

async function listAllCloudFormationLambdas(
    cloudFormationClient: CloudFormationClient
): Promise<Map<string, CloudFormationLambda>> {
    const allLambdas = new Map<string, CloudFormationLambda>()
    const stackNames = await listActiveStackNames(cloudFormationClient)

    console.info(
        `Scanning ${stackNames.length} active CloudFormation stacks...`
    )

    for (const stackName of stackNames) {
        const stackLambdas = await listCloudFormationLambdas(
            cloudFormationClient,
            stackName
        )

        for (const [functionName, metadata] of stackLambdas) {
            allLambdas.set(functionName, metadata)
        }
    }

    return allLambdas
}

async function findOldNodeLambdas(
    lambdaClient: LambdaClient,
    cloudFormationLambdas: Map<string, CloudFormationLambda>
): Promise<OldNodeLambda[]> {
    const oldNodeLambdas: OldNodeLambda[] = []
    let nextMarker: string | undefined

    do {
        const response = await lambdaClient.send(
            new ListFunctionsCommand({
                Marker: nextMarker,
            })
        )

        for (const lambdaFunction of response.Functions ?? []) {
            const majorVersion = getNodeMajorVersion(lambdaFunction.Runtime)

            if (majorVersion === undefined || majorVersion >= 24) continue

            const functionName = lambdaFunction.FunctionName ?? ''
            const cloudFormationLambda = cloudFormationLambdas.get(functionName)

            oldNodeLambdas.push({
                functionName,
                runtime: lambdaFunction.Runtime ?? '',
                managedBy: cloudFormationLambda
                    ? 'CloudFormation'
                    : 'Unmanaged',
                stackName: cloudFormationLambda?.stackName ?? '',
                logicalId: cloudFormationLambda?.logicalId ?? '',
                functionArn: lambdaFunction.FunctionArn ?? '',
            })
        }

        nextMarker = response.NextMarker
    } while (nextMarker)

    return oldNodeLambdas.sort((a, b) => {
        const managedByCompare = a.managedBy.localeCompare(b.managedBy)
        if (managedByCompare !== 0) return managedByCompare

        return a.functionName.localeCompare(b.functionName)
    })
}

async function main(): Promise<void> {
    if (process.argv.includes('--help')) {
        printUsage()
        return
    }

    const region = getRegion()
    const awsConfig = { region }
    const cloudFormationClient = new CloudFormationClient(awsConfig)
    const lambdaClient = new LambdaClient(awsConfig)

    console.info(`Scanning Lambda runtimes in ${region}...`)

    const cloudFormationLambdas =
        await listAllCloudFormationLambdas(cloudFormationClient)
    const oldNodeLambdas = await findOldNodeLambdas(
        lambdaClient,
        cloudFormationLambdas
    )

    if (oldNodeLambdas.length === 0) {
        console.info('No Lambda functions found using Node.js older than v24.')
        return
    }

    const cloudFormationManagedCount = oldNodeLambdas.filter(
        (lambdaFunction) => lambdaFunction.managedBy === 'CloudFormation'
    ).length
    const unmanagedCount = oldNodeLambdas.length - cloudFormationManagedCount

    console.info(
        `Found ${oldNodeLambdas.length} Lambda function(s) using Node.js older than v24.`
    )
    console.info(
        `CloudFormation-managed: ${cloudFormationManagedCount}; unmanaged: ${unmanagedCount}`
    )

    console.table(
        oldNodeLambdas.map((lambdaFunction) => ({
            runtime: lambdaFunction.runtime,
            managedBy: lambdaFunction.managedBy,
            functionName: lambdaFunction.functionName,
            stackName: lambdaFunction.stackName,
            logicalId: lambdaFunction.logicalId,
        }))
    )
}

main().catch((error) => {
    console.error('Failed to scan Lambda runtimes:', error)
    process.exit(1)
})
