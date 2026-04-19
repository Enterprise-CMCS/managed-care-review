import type {
    DescribeDBClusterSnapshotsCommandInput,
    DeleteDBClusterSnapshotCommandInput,
} from '@aws-sdk/client-rds'
import {
    RDSClient,
    DescribeDBClusterSnapshotsCommand,
    DeleteDBClusterSnapshotCommand,
} from '@aws-sdk/client-rds'
import {
    DeleteObjectsCommand,
    ListObjectsV2Command,
    S3Client,
} from '@aws-sdk/client-s3'

export const VALIDATION_ARTIFACT_PREFIX = 'rag-indexes/'
export const DEFAULT_VALIDATION_ARTIFACT_RETENTION_DAYS = 30

interface S3ArtifactObjectSummary {
    Key?: string
    LastModified?: Date
}

const main = async () => {
    const region = process.env.AWS_REGION || 'us-east-1'
    const rdsClient = new RDSClient({ region })
    const s3Client = new S3Client({ region })

    await cleanupOldSnapshots(rdsClient)
    await cleanupExpiredValidationArtifacts({
        s3Client,
        bucket: process.env.AI_VALIDATION_ARTIFACT_BUCKET,
        retentionDays: getValidationArtifactRetentionDays(),
    })
}

export async function cleanupOldSnapshots(
    client: Pick<RDSClient, 'send'>
): Promise<void> {
    const timestamp = getRetentionCutoffTimestamp(30)

    let snapshots
    try {
        // find all snapshots in our account
        const describeInput: DescribeDBClusterSnapshotsCommandInput = {}
        const describeCommand = new DescribeDBClusterSnapshotsCommand(
            describeInput
        )
        snapshots = await client.send(describeCommand)
    } catch (error) {
        console.error('Error fetching DB cluster snapshots:', error)
        throw error
    }

    // find snapshots older than 30 days, filter them out
    const oldSnapshots = snapshots.DBClusterSnapshots?.filter((snapshot) => {
        return (
            snapshot.SnapshotCreateTime != undefined &&
            snapshot.SnapshotCreateTime.getTime() < timestamp
        )
    })

    console.info(
        `Found ${oldSnapshots?.length || 0} snapshots older than 30 days to delete`
    )

    if (!oldSnapshots || oldSnapshots.length === 0) {
        console.info('No old snapshots to delete')
        return
    }

    // Use Promise.all to wait for all delete operations to complete
    try {
        const deletePromises = oldSnapshots.map(async (snapshot) => {
            const deleteInput: DeleteDBClusterSnapshotCommandInput = {
                DBClusterSnapshotIdentifier:
                    snapshot.DBClusterSnapshotIdentifier,
            }
            const deleteCommand = new DeleteDBClusterSnapshotCommand(
                deleteInput
            )
            const response = await client.send(deleteCommand)
            console.info(
                `Deleted old snapshot: ${snapshot.DBClusterSnapshotIdentifier}`
            )
            return response
        })

        await Promise.all(deletePromises)
        console.info('Successfully deleted all old snapshots')
    } catch (error) {
        console.error('Error deleting snapshots:', error)
        throw error
    }
}

export async function cleanupExpiredValidationArtifacts(input: {
    s3Client: Pick<S3Client, 'send'>
    bucket?: string
    retentionDays?: number
    now?: Date
}): Promise<number> {
    if (!input.bucket) {
        console.info(
            'AI validation artifact bucket not configured, skipping artifact cleanup'
        )
        return 0
    }

    const retentionDays =
        input.retentionDays ?? DEFAULT_VALIDATION_ARTIFACT_RETENTION_DAYS
    const timestamp = getRetentionCutoffTimestamp(
        retentionDays,
        input.now ?? new Date()
    )
    let deletedCount = 0
    let continuationToken: string | undefined

    do {
        // Keep cleanup scoped to the existing validation-artifact prefix so we
        // do not change the current storage contract for other bucket contents.
        const response = await input.s3Client.send(
            new ListObjectsV2Command({
                Bucket: input.bucket,
                Prefix: VALIDATION_ARTIFACT_PREFIX,
                ContinuationToken: continuationToken,
            })
        )

        const expiredObjects = (response.Contents ?? []).filter((object) =>
            isExpiredValidationArtifact(object, timestamp)
        )

        if (expiredObjects.length > 0) {
            await input.s3Client.send(
                new DeleteObjectsCommand({
                    Bucket: input.bucket,
                    Delete: {
                        Objects: expiredObjects.flatMap((object) =>
                            object.Key ? [{ Key: object.Key }] : []
                        ),
                    },
                })
            )

            deletedCount += expiredObjects.length
        }

        continuationToken = response.IsTruncated
            ? response.NextContinuationToken
            : undefined
    } while (continuationToken)

    console.info(
        `Deleted ${deletedCount} expired AI validation artifact objects from ${input.bucket}`
    )

    return deletedCount
}

function getValidationArtifactRetentionDays(): number {
    const value = process.env.AI_VALIDATION_ARTIFACT_RETENTION_DAYS

    if (!value) {
        return DEFAULT_VALIDATION_ARTIFACT_RETENTION_DAYS
    }

    const parsed = Number.parseInt(value, 10)

    if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(
            `AI_VALIDATION_ARTIFACT_RETENTION_DAYS must be a positive integer, received: ${value}`
        )
    }

    return parsed
}

function getRetentionCutoffTimestamp(days: number, now: Date = new Date()) {
    return now.getTime() - days * 24 * 60 * 60 * 1000
}

function isExpiredValidationArtifact(
    object: S3ArtifactObjectSummary,
    cutoffTimestamp: number
): boolean {
    return (
        object.Key?.startsWith(VALIDATION_ARTIFACT_PREFIX) === true &&
        object.LastModified != undefined &&
        object.LastModified.getTime() < cutoffTimestamp
    )
}

export { main }
