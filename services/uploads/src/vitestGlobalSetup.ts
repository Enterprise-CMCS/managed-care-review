import { NewClamAV } from './deps/clamAV'
import { NewTestS3UploadsClient } from './deps/s3'
import { updateAVDefinitions } from './lib/updateAVDefinitions'
import { rm, mkdtemp } from 'fs/promises'
import path from 'path'
import { uploadedAt } from './lib/tags'

// setupAVDefinitionsBucket is called by jest as 'globalSetup' and runs
// once on startup of Jest. It runs freshclam to populate the test-av-definitions
// bucket that is used by all the tests that scan files in this service.
async function setupAVDefinitionsBucket(): Promise<undefined> {
    console.info('setting up AV definitions bucket in globalSetup!')

    const thisDir = __dirname
    const tmpDefsDir = await mkdtemp('/tmp/clamscan-')

    const s3Client = NewTestS3UploadsClient()

    const clamAV = NewClamAV(
        {
            bucketName: 'test-av-definitions',
            definitionsPath: 'lambda/s3-antivirus/av-definitions',

            pathToClamav: 'clamscan',
            pathToFreshclam: 'freshclam',
            pathToConfig: path.join(thisDir, 'testData', 'freshclam.conf'),
            pathToDefintions: tmpDefsDir,
        },
        s3Client
    )

    // freshclam is rate limited by the definitions server.
    // if there is no freshclam data in s3 or the current  data is less than a
    // day old, run freshclam otherwise, do nothing.
    const freshclamDatKey = path.join(
        'lambda/s3-antivirus/av-definitions',
        'freshclam.dat'
    )

    let shouldRunFreshclam = false
    const res = await s3Client.getObjectTags(
        freshclamDatKey,
        'test-av-definitions'
    )
    if (res instanceof Error && res.name !== 'NoSuchKey') {
        console.info('Error getting tags', res)
        throw res
    } else if (res instanceof Error) {
        // freshclam has not been run yet here.
        console.info('no freshclam files exist')
        shouldRunFreshclam = true
    } else {
        const uploadedDate = uploadedAt(res)
        // This doesn't respect DST or leap anythings but is good enough for testing
        const aDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000)

        // If this file was uploaded more than one day ago, we should rerun freshclam
        if (!uploadedDate || uploadedDate < aDayAgo) {
            // Override the call to freshclam
            console.info('freshclam was last updated more than a day ago')
            shouldRunFreshclam = true
        }
    }

    if (shouldRunFreshclam) {
        console.info('Running freshclam')
        const res = await updateAVDefinitions(s3Client, clamAV, tmpDefsDir)
        if (res instanceof Error) {
            throw res
        }
        console.info('Ran freshclam')
    }

    await rm(tmpDefsDir, { force: true, recursive: true })

    return
}

export default setupAVDefinitionsBucket
