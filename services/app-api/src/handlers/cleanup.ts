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

    // find all snapshots in our account
    const describeInput: DescribeDBClusterSnapshotsCommandInput = {}
    const describeCommand = new DescribeDBClusterSnapshotsCommand(describeInput)
    const snapshots = await client.send(describeCommand)

    // find snapshots older than 30 days, filter them out
    const timestamp = new Date().getTime() - 30 * 24 * 60 * 60 * 1000 // d * hr * min * s * ms
    const oldSnapshots = snapshots.DBClusterSnapshots?.filter((snapshot) => {
        return (
            snapshot.SnapshotCreateTime != undefined &&
            timestamp > snapshot.SnapshotCreateTime.getTime()
        )
    })

    // delete the older snapshots
    oldSnapshots?.forEach(async (snapshot) => {
        const deleteInput: DeleteDBClusterSnapshotCommandInput = {
            DBClusterSnapshotIdentifier: snapshot.DBClusterSnapshotIdentifier,
        }

        const deleteCommand = new DeleteDBClusterSnapshotCommand(deleteInput)
        const response = await client.send(deleteCommand)
        console.info('Deleted old snapshot: ' + response)
    })
}

module.exports = { main }
