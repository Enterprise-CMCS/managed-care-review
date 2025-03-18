import type {
    DescribeDBClusterSnapshotsCommandInput,
    DeleteDBClusterSnapshotCommandInput,
} from '@aws-sdk/client-rds'
import {
    RDSClient,
    DescribeDBClusterSnapshotsCommand,
    DeleteDBClusterSnapshotCommand,
} from '@aws-sdk/client-rds'

const main = async () => {
    const client = new RDSClient({ region: 'us-east-1' })

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
    const timestamp = new Date().getTime() - 30 * 24 * 60 * 60 * 1000 // d * hr * min * s * ms
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

module.exports = { main }
