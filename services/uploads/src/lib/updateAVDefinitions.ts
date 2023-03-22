import { rm, readdir } from 'fs/promises'
import path from 'path'
import { S3UploadsClient } from '../deps/s3'
import { ClamAV } from '../deps/clamAV'

async function emptyWorkdir(workdir: string): Promise<undefined | Error> {
    console.info('cleaning workdir: ', workdir)
    try {
        const files = await readdir(workdir)

        for (const file of files) {
            const filePath = path.join(workdir, file)
            await rm(filePath)
        }
    } catch (err) {
        console.error('FS Error cleaning workdir', err)
        return err
    }
}

async function updateAVDefinitions(
    _s3Client: S3UploadsClient,
    clamAV: ClamAV,
    workdir: string
): Promise<undefined | Error> {
    // cleanup the workdir
    const res = await emptyWorkdir(workdir)
    if (res) {
        return res
    }

    // run freshclam, fetching the latest virus definition files from ClamAV
    const freshErr = await clamAV.fetchAVDefinitionsWithFreshclam(workdir)
    if (freshErr) {
        return freshErr
    }

    // upload the new definitions to the definitions bucket
    const uploadErr = await clamAV.uploadAVDefinitions(workdir)
    if (uploadErr) {
        return uploadErr
    }
}

export { updateAVDefinitions }
