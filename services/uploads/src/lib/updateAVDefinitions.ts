import { rm, readdir } from 'fs/promises'
import { S3UploadsClient } from '../deps/s3'
import { ClamAV } from '../deps/clamAV'

async function emptyWorkdir(workdir: string): Promise<undefined | Error> {
    console.info('cleaning workdir: ', workdir)
    try {
        console.info('-- Folder before cleanup --')
        const files = await readdir(workdir)
        console.info(files)
        await rm(workdir, { recursive: true })
        console.info('-- Folder after cleanup --')

        const filesAfter = await readdir(workdir)
        console.info(filesAfter)
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
