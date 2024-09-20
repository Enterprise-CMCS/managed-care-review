import path from 'path'
import crypto from 'crypto'
import { ClamAV } from '../deps/clamAV'
import { S3UploadsClient } from '../deps/s3'

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
    //const mimeTypeErrors: string[] = []

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
        /*
        // check file mime type matches: pen test finding
        try {
            const fileBuffer = await fs.readFile(scanFilePath)
            const detectedType = await fileTypeFromBuffer(fileBuffer)

            // Get the Content-Type from S3 metadata
            const metadata = await s3Client.getObjectContentType(bucket, key)
            if (metadata instanceof Error) {
                console.error(
                    `Could not get file's content type from S3 bucket`
                )
                return metadata
            }
            const declaredContentType = metadata.ContentType

            if (detectedType && declaredContentType) {
                if (detectedType.mime !== declaredContentType) {
                    console.warn(
                        `MIME type mismatch for ${key}: Content-Type is ${declaredContentType}, detected type is ${detectedType.mime}`
                    )
                    mimeTypeErrors.push(`MIME type mismatch for ${key}`)
                } else {
                    console.log(`MIME type check passed for ${key}`)
                }
            } else {
                console.warn(`Could not determine MIME type for ${key}`)
            }
        } catch (mimeError) {
            console.error(`Error checking MIME type for ${key}:`, mimeError)
        }
            */
    }

    console.info('Scanning Files')
    const res = clamAV.scanForInfectedFiles(scanDir)
    console.info('VIRUSES SCANNED', res)

    if (res instanceof Error) {
        return res
    }

    return res.map((filename) => filemap[filename])
}
