import {
    RDSClient,
    DescribeDBClusterSnapshotsCommandInput,
    DescribeDBClusterSnapshotsCommand,
} from '@aws-sdk/client-rds'

export const main = async () => {
    const client = new RDSClient({ region: 'us-east-1' })

    // find all snapshots in our account
    const input: DescribeDBClusterSnapshotsCommandInput = {}
    const command = new DescribeDBClusterSnapshotsCommand(input)
    const response = await client.send(command)

    // find snapshots older than 14 days, filter them out
    const timestamp = new Date().getTime() - 14 * 24 * 60 * 60 * 1000 // d * hr * min * s * ms
    const oldSnapshots = response.DBClusterSnapshots?.filter((snapshot) => {
        if (
            snapshot.SnapshotCreateTime != undefined &&
            timestamp > snapshot.SnapshotCreateTime.getTime()
        ) {
            return snapshot
        }
    })

    console.log(oldSnapshots)
}
