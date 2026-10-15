import {
    type CognitoIdentityProviderClient,
    paginateListUserPools,
    DescribeUserPoolCommand,
    DeleteUserPoolDomainCommand,
    DeleteUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import {
    type CloudFormationClient,
    paginateListStacks,
    paginateListStackResources,
    DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation'
import { type STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { isDeepStrictEqual } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'

const DAY_MS = 86_400_000
const PROTECTED_STAGES = new Set([
    'dev',
    'val',
    'prod',
    'qa',
    'main',
    'master',
    'develop',
    'impl',
    'production',
])

export interface CleanupClients {
    cognito: CognitoIdentityProviderClient
    cloudFormation: CloudFormationClient
    sts: STSClient
}
export interface UserPoolSnapshot {
    id: string
    name: string
    arn: string
    createdAt: string
    modifiedAt: string
    tags: Record<string, string>
    deletionProtection: string
    domain?: string
    customDomain?: string
    estimatedUsers: number
}
export interface CleanupPlan {
    version: 1
    accountId: string
    region: string
    createdAt: string
    minAgeDays: number
    candidates: UserPoolSnapshot[]
    skipped: { id: string; name: string; reason: string }[]
}
export interface CleanupAuditEvent {
    id: string
    action: string
    reason?: string
}
interface LiveStackOwnership {
    stackNames: Set<string>
    stackIds: Set<string>
    poolIds: Set<string>
}

function assertNewPaginationToken(
    token: string | undefined,
    seen: Set<string>
): void {
    if (!token) return
    if (seen.has(token))
        throw new Error(
            'Repeated pagination token; refusing incomplete inventory'
        )
    seen.add(token)
}

async function loadLiveStackOwnership(
    client: CloudFormationClient,
    onProgress?: (message: string) => void
): Promise<LiveStackOwnership> {
    const ownership: LiveStackOwnership = {
        stackNames: new Set(),
        stackIds: new Set(),
        poolIds: new Set(),
    }
    const stackTokens = new Set<string>()
    let scannedStacks = 0
    onProgress?.('Scanning CloudFormation stacks and resources...')
    for await (const page of paginateListStacks({ client }, {})) {
        assertNewPaginationToken(page.NextToken, stackTokens)
        for (const stack of page.StackSummaries ?? []) {
            if (!stack.StackId || !stack.StackName || !stack.StackStatus)
                throw new Error('Incomplete CloudFormation stack summary')
            // Failed, in-progress, and rollback stacks all remain protected.
            if (stack.StackStatus === 'DELETE_COMPLETE') continue
            scannedStacks++
            if (scannedStacks === 1 || scannedStacks % 10 === 0) {
                onProgress?.(
                    `CloudFormation: scanning live stack ${scannedStacks} (${stack.StackName}); ${ownership.poolIds.size} managed pools found`
                )
            }
            ownership.stackNames.add(stack.StackName)
            ownership.stackIds.add(stack.StackId)
            const resourceTokens = new Set<string>()
            for await (const resources of paginateListStackResources(
                { client },
                { StackName: stack.StackId }
            )) {
                assertNewPaginationToken(resources.NextToken, resourceTokens)
                for (const resource of resources.StackResourceSummaries ?? []) {
                    if (!resource.ResourceType)
                        throw new Error(
                            'Incomplete CloudFormation resource summary'
                        )
                    if (
                        resource.ResourceType === 'AWS::Cognito::UserPool' &&
                        resource.PhysicalResourceId
                    )
                        ownership.poolIds.add(resource.PhysicalResourceId)
                }
            }
        }
    }
    onProgress?.(
        `CloudFormation inventory complete: ${scannedStacks} live stacks, ${ownership.poolIds.size} managed pools`
    )
    return ownership
}

async function describeUserPool(
    client: CognitoIdentityProviderClient,
    poolId: string
): Promise<UserPoolSnapshot | undefined> {
    try {
        const { UserPool: pool } = await client.send(
            new DescribeUserPoolCommand({ UserPoolId: poolId })
        )
        if (
            !pool?.Id ||
            !pool.Name ||
            !pool.Arn ||
            !pool.CreationDate ||
            !pool.LastModifiedDate
        )
            throw new Error(`Incomplete description for ${poolId}`)
        return {
            id: pool.Id,
            name: pool.Name,
            arn: pool.Arn,
            createdAt: pool.CreationDate.toISOString(),
            modifiedAt: pool.LastModifiedDate.toISOString(),
            tags: pool.UserPoolTags ?? {},
            deletionProtection: pool.DeletionProtection ?? 'UNKNOWN',
            domain: pool.Domain,
            customDomain: pool.CustomDomain,
            estimatedUsers: pool.EstimatedNumberOfUsers ?? 0,
        }
    } catch (error) {
        if (
            error instanceof Error &&
            error.name === 'ResourceNotFoundException'
        )
            return undefined
        throw error
    }
}

async function assertCallerAccount(
    client: STSClient,
    accountId: string
): Promise<void> {
    const { Account } = await client.send(new GetCallerIdentityCommand({}))
    if (Account !== accountId)
        throw new Error(
            'AWS caller account does not match the supplied dev account ID'
        )
}

async function stackStillExists(
    client: CloudFormationClient,
    stackNameOrId: string
): Promise<boolean> {
    try {
        const { Stacks } = await client.send(
            new DescribeStacksCommand({ StackName: stackNameOrId })
        )
        if (!Stacks?.length)
            throw new Error(`Incomplete description for stack ${stackNameOrId}`)
        return Stacks.some((stack) => stack.StackStatus !== 'DELETE_COMPLETE')
    } catch (error) {
        // AccessDenied, throttling, and generic validation errors are NOT absence.
        if (
            error instanceof Error &&
            error.name === 'ValidationError' &&
            /Stack with id .+ does not exist/.test(error.message)
        )
            return false
        throw error
    }
}

function getEligibleReviewStage(pool: UserPoolSnapshot): string | undefined {
    const stage = pool.tags.Environment
    if (
        !stage ||
        !/^[a-z][a-z0-9-]{1,22}$/.test(stage) ||
        stage.endsWith('-') ||
        stage.includes('--') ||
        PROTECTED_STAGES.has(stage)
    )
        return undefined
    if (
        pool.tags.Project !== 'Managed Care Review' ||
        pool.tags.ManagedBy !== 'CDK' ||
        pool.tags.Service !== 'cognito'
    )
        return undefined
    return pool.name === `${stage}-user-pool` ? stage : undefined
}

function getPoolSkipReason(
    pool: UserPoolSnapshot,
    plan: CleanupPlan,
    ownership: LiveStackOwnership,
    now: number
): string | undefined {
    if (
        pool.arn !==
            `arn:aws:cognito-idp:${plan.region}:${plan.accountId}:userpool/${pool.id}` ||
        !pool.id.startsWith(`${plan.region}_`)
    )
        throw new Error(`Account/region/ARN mismatch for ${pool.id}; aborting`)
    const stage = getEligibleReviewStage(pool)
    if (!stage)
        return 'Not an exact MCR CDK review pool (protected stage, tags, or name mismatch)'
    if (ownership.poolIds.has(pool.id))
        return 'User pool is owned by a live CloudFormation stack'
    if (ownership.stackNames.has(`cognito-${stage}-cdk`))
        return 'A Cognito stack for this stage still exists'
    const sourceId = pool.tags['aws:cloudformation:stack-id']
    if (sourceId) {
        if (
            !sourceId.startsWith(
                `arn:aws:cloudformation:${plan.region}:${plan.accountId}:stack/cognito-${stage}-cdk/`
            )
        )
            return 'Unexpected source stack tag'
        if (ownership.stackIds.has(sourceId))
            return 'Source CloudFormation stack still exists'
    }
    const created = Date.parse(pool.createdAt)
    if (!Number.isFinite(created) || now - created < plan.minAgeDays * DAY_MS)
        return 'Pool is too new or has an invalid creation date'
    if (pool.deletionProtection !== 'INACTIVE')
        return 'Deletion protection is active or unknown'
    if (pool.customDomain) return 'Custom domain requires manual investigation'
    if (pool.domain && !pool.domain.startsWith(`${stage}-login-`))
        return 'Unexpected Cognito domain requires manual investigation'
    return undefined
}

export async function buildCleanupPlan(
    clients: CleanupClients,
    options: {
        accountId: string
        region: string
        minAgeDays?: number
        now?: number
        onProgress?: (message: string) => void
    }
): Promise<CleanupPlan> {
    const {
        accountId,
        region,
        minAgeDays = 7,
        now = Date.now(),
        onProgress,
    } = options
    if (!/^\d{12}$/.test(accountId))
        throw new Error('Expected a 12-digit dev account ID')
    if (region !== 'us-east-1')
        throw new Error('Only the MCR dev region us-east-1 is supported')
    if (!Number.isInteger(minAgeDays) || minAgeDays < 1)
        throw new Error('Minimum age must be an integer of at least 1 day')
    onProgress?.('Verifying AWS caller account...')
    await assertCallerAccount(clients.sts, accountId)
    const ownership = await loadLiveStackOwnership(
        clients.cloudFormation,
        onProgress
    )
    const plan: CleanupPlan = {
        version: 1,
        accountId,
        region,
        createdAt: new Date(now).toISOString(),
        minAgeDays,
        candidates: [],
        skipped: [],
    }
    const poolTokens = new Set<string>()
    let inspectedPools = 0
    onProgress?.('Scanning Cognito user pools...')
    for await (const page of paginateListUserPools(
        { client: clients.cognito },
        { MaxResults: 60 }
    )) {
        assertNewPaginationToken(page.NextToken, poolTokens)
        for (const summary of page.UserPools ?? []) {
            if (!summary.Id) throw new Error('Incomplete Cognito pool summary')
            const pool = await describeUserPool(clients.cognito, summary.Id)
            inspectedPools++
            if (pool) {
                // Pools can disappear during inventory.
                const reason = getPoolSkipReason(pool, plan, ownership, now)
                if (reason)
                    plan.skipped.push({ id: pool.id, name: pool.name, reason })
                else plan.candidates.push(pool)
            }
            if (inspectedPools === 1 || inspectedPools % 25 === 0) {
                onProgress?.(
                    `Cognito: inspected ${inspectedPools} pools; ${plan.candidates.length} candidates, ${plan.skipped.length} protected/skipped`
                )
            }
        }
    }
    onProgress?.(
        `Cognito inventory complete: inspected ${inspectedPools} pools; ${plan.candidates.length} candidates, ${plan.skipped.length} protected/skipped`
    )
    plan.candidates.sort(
        (a, b) =>
            a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
    )
    return plan
}

function isValidPoolSnapshot(pool: UserPoolSnapshot): boolean {
    return (
        !!pool &&
        typeof pool === 'object' &&
        [
            'id',
            'name',
            'arn',
            'createdAt',
            'modifiedAt',
            'deletionProtection',
        ].every(
            (key) => typeof pool[key as keyof UserPoolSnapshot] === 'string'
        ) &&
        !!pool.tags &&
        typeof pool.tags === 'object' &&
        !Array.isArray(pool.tags) &&
        Object.values(pool.tags).every((value) => typeof value === 'string') &&
        Number.isFinite(Date.parse(pool.createdAt)) &&
        Number.isFinite(Date.parse(pool.modifiedAt)) &&
        Number.isInteger(pool.estimatedUsers) &&
        pool.estimatedUsers >= 0 &&
        (pool.domain === undefined || typeof pool.domain === 'string') &&
        (pool.customDomain === undefined ||
            typeof pool.customDomain === 'string')
    )
}

// A reviewed JSON file is still untrusted input. Validate before any AWS mutation.
function validateCleanupPlan(value: unknown, now: number): CleanupPlan {
    if (!value || typeof value !== 'object')
        throw new Error('Invalid cleanup plan')
    const plan = value as CleanupPlan
    const created = Date.parse(plan.createdAt)
    if (
        plan.version !== 1 ||
        !/^\d{12}$/.test(plan.accountId) ||
        plan.region !== 'us-east-1' ||
        !Number.isInteger(plan.minAgeDays) ||
        plan.minAgeDays < 1 ||
        typeof plan.createdAt !== 'string' ||
        !Number.isFinite(created) ||
        created > now ||
        now - created > DAY_MS ||
        !Array.isArray(plan.candidates)
    )
        throw new Error(
            'Invalid or expired plan; regenerate it (maximum age 24 hours)'
        )
    const ids = new Set<string>()
    for (const pool of plan.candidates) {
        if (!isValidPoolSnapshot(pool) || ids.has(pool.id))
            throw new Error('Malformed or duplicate candidate in plan')
        ids.add(pool.id)
    }
    return plan
}

function hasPoolChangedSincePlanning(
    current: UserPoolSnapshot,
    planned: UserPoolSnapshot
): boolean {
    // JSON omits undefined optional fields. Normalize them before comparing.
    return !isDeepStrictEqual(
        {
            ...current,
            domain: current.domain ?? '',
            customDomain: current.customDomain ?? '',
        },
        {
            ...planned,
            domain: planned.domain ?? '',
            customDomain: planned.customDomain ?? '',
        }
    )
}

async function waitForDomainDeletion(
    client: CognitoIdentityProviderClient,
    poolId: string,
    sleep: (milliseconds: number) => Promise<unknown>
): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt++) {
        const pool = await describeUserPool(client, poolId)
        if (!pool?.domain) return
        await sleep(3000)
    }
    throw new Error(
        `Domain deletion has not completed for ${poolId}; stopped, regenerate the plan before retrying`
    )
}

export async function applyCleanupPlan(
    clients: CleanupClients,
    value: unknown,
    options: {
        accountId: string
        confirmDelete: string
        limit: number
        audit: (event: CleanupAuditEvent) => void
        now?: number
        sleep?: (milliseconds: number) => Promise<unknown>
        onProgress?: (message: string) => void
    }
): Promise<void> {
    const { now = Date.now(), sleep = delay, audit, onProgress } = options
    const plan = validateCleanupPlan(value, now)
    if (
        options.accountId !== plan.accountId ||
        options.confirmDelete !== plan.accountId
    )
        throw new Error('Account confirmation does not match the plan')
    onProgress?.('Verifying AWS caller account...')
    await assertCallerAccount(clients.sts, plan.accountId)
    if (
        !Number.isInteger(options.limit) ||
        options.limit < 1 ||
        options.limit > 100
    )
        throw new Error('Batch limit must be between 1 and 100')
    // Complete a fresh ownership inventory before the first deletion.
    const ownership = await loadLiveStackOwnership(
        clients.cloudFormation,
        onProgress
    )
    onProgress?.(
        `Revalidating ${plan.candidates.length} reviewed candidates; at most ${options.limit} pool deletions will be requested`
    )
    let deletedCount = 0
    let checkedCount = 0
    for (const approved of plan.candidates) {
        if (deletedCount >= options.limit) break
        checkedCount++
        if (checkedCount === 1 || checkedCount % 25 === 0) {
            onProgress?.(
                `Checking reviewed candidate ${checkedCount}/${plan.candidates.length}; ${deletedCount} pool deletions requested`
            )
        }
        const pool = await describeUserPool(clients.cognito, approved.id)
        if (!pool) {
            audit({ id: approved.id, action: 'already-absent' })
            continue
        }
        const reason = getPoolSkipReason(pool, plan, ownership, now)
        if (reason || hasPoolChangedSincePlanning(pool, approved)) {
            audit({
                id: pool.id,
                action: 'skipped',
                reason:
                    reason ?? 'Pool changed since planning; regenerate plan',
            })
            continue
        }
        const stage = getEligibleReviewStage(pool)!
        const sourceId = pool.tags['aws:cloudformation:stack-id']
        if (
            (await stackStillExists(
                clients.cloudFormation,
                `cognito-${stage}-cdk`
            )) ||
            (sourceId &&
                (await stackStillExists(clients.cloudFormation, sourceId)))
        ) {
            audit({
                id: pool.id,
                action: 'skipped',
                reason: 'Stage/source stack appeared since inventory',
            })
            continue
        }
        audit({ id: pool.id, action: 'delete-started' })
        try {
            if (pool.domain) {
                await clients.cognito.send(
                    new DeleteUserPoolDomainCommand({
                        UserPoolId: pool.id,
                        Domain: pool.domain,
                    })
                )
                audit({ id: pool.id, action: 'domain-delete-requested' })
                onProgress?.(
                    `Waiting for Cognito domain removal on ${pool.id}...`
                )
                await waitForDomainDeletion(clients.cognito, pool.id, sleep)
                audit({ id: pool.id, action: 'domain-deletion-confirmed' })
            }
            onProgress?.(
                `Requesting pool deletion ${deletedCount + 1}/${options.limit}: ${pool.id}`
            )
            await clients.cognito.send(
                new DeleteUserPoolCommand({ UserPoolId: pool.id })
            )
            deletedCount++
            audit({ id: pool.id, action: 'pool-delete-requested' })
        } catch (error) {
            audit({
                id: pool.id,
                action: 'failed',
                reason: error instanceof Error ? error.message : String(error),
            })
            throw error // Stop after a partial failure; never silently continue.
        }
    }
    onProgress?.(
        `Batch complete: ${deletedCount} pool deletions requested; ${checkedCount} reviewed candidates checked`
    )
}
