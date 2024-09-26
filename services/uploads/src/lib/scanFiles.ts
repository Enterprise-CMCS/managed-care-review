import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { ClamAV } from '../deps/clamAV'
import { S3UploadsClient } from '../deps/s3'
import { fileTypeFromBuffer } from 'file-type'
import { lookup } from 'mime-types'

// returns a list of aws keys that are infected
// scanDir is the directory where files should be downloaded and scanned and should exist already
export async function scanFiles(
    s3Client: S3UploadsClient,
    clamAV: ClamAV,
    keys: string[],
    bucket: string,
    scanDir: string
): Promise<string[] | Error> {
    // clamScan wants files to be top level in the scanned directory, so we map each key to a UUID
    const filemap: { [filename: string]: string } = {}

    for (const key of keys) {
        console.info('Downloading file to be scanned', key)
        const scanFileName = `${crypto.randomUUID()}.tmp`
        const scanFilePath = path.join(scanDir, scanFileName)

        filemap[scanFileName] = key

        const err = await s3Client.downloadFileFromS3(key, bucket, scanFilePath)
        if (err instanceof Error) {
            console.error('failed to download one of the scan files', err)
            return err
        }

        // check file mime type matches: pen test finding
        try {
            const fileBuffer = await fs.readFile(scanFilePath)
            const detectedType = await fileTypeFromBuffer(fileBuffer)

            // get the mime type based on the file's declared extension
            const originalFilename = await s3Client.getOriginalFilename(
                key,
                bucket
            )
            if (originalFilename instanceof Error) {
                const err = new Error(
                    `Could not get the original filename of file ${originalFilename}`
                )
                console.error(err)
                return err
            }
            const declaredContentType = lookup(path.extname(originalFilename))

            if (detectedType && declaredContentType) {
                if (detectedType.mime !== declaredContentType) {
                    const err = new Error(
                        `MIME type mismatch for ${key}: Content-Type is ${declaredContentType}, detected type is ${detectedType.mime}`
                    )
                    console.error(err)
                    return err
                }
            } else {
                const err = new Error(
                    `Could not determine MIME type for ${key}`
                )
                console.error(err)
                return err
            }
        } catch (mimeError) {
            return mimeError
        }
    }

    console.info('Scanning Files')
    const res = clamAV.scanForInfectedFiles(scanDir)
    console.info('VIRUSES SCANNED', res)

    if (res instanceof Error) {
        return res
    }

    return res.map((filename) => filemap[filename])
}
