import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { ClamAV } from '../deps/clamAV'
import { S3UploadsClient } from '../deps/s3'
import { fileTypeFromBuffer, FileTypeResult } from 'file-type'
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
    }
    // Perform virus scan
    console.info('Scanning Files')
    const virusScanResult = clamAV.scanForInfectedFiles(scanDir)
    console.info('VIRUSES SCANNED', virusScanResult)

    if (virusScanResult instanceof Error) {
        return virusScanResult
    }

    // Perform MIME type check
    console.info('Checking MIME Types')
    const mimeCheckResult = await checkMimeTypes(
        s3Client,
        bucket,
        scanDir,
        filemap
    )
    if (mimeCheckResult instanceof Error) {
        return mimeCheckResult
    }

    // combine the results
    const infectedFiles = virusScanResult.map((filename) => filemap[filename])

    return [...new Set([...infectedFiles, ...mimeCheckResult])]
}

async function checkMimeTypes(
    s3Client: S3UploadsClient,
    bucket: string,
    scanDir: string,
    filemap: { [filename: string]: string }
): Promise<string[] | Error> {
    const mismatchedFiles: string[] = []

    for (const [scanFileName, key] of Object.entries(filemap)) {
        try {
            const scanFilePath = path.join(scanDir, scanFileName)
            const originalFilename = await s3Client.getOriginalFilename(
                key,
                bucket
            )
            if (originalFilename instanceof Error) {
                return new Error(
                    `Could not get the original filename of file ${key}`
                )
            }

            const declaredContentType = lookup(path.extname(originalFilename))
            const isValid = await validateFileContent(
                scanFilePath,
                declaredContentType
            )

            if (isValid instanceof Error) {
                return isValid
            }

            if (!isValid) {
                console.info(`Original filename: ${originalFilename}`)
                console.error(
                    `MIME type mismatch for ${key}: Content does not match declared type ${declaredContentType}`
                )
                mismatchedFiles.push(key)
            }
        } catch (mimeError) {
            return mimeError instanceof Error
                ? mimeError
                : new Error('An unknown error occurred during MIME type check')
        }
    }

    return mismatchedFiles
}

async function validateFileContent(
    filePath: string,
    declaredMimeType: string
): Promise<boolean | Error> {
    try {
        const fileBuffer = await fs.readFile(filePath)
        let detectedType: DetectedFileType | undefined =
            await fileTypeFromBuffer(fileBuffer)

        if (!detectedType) {
            const fileContent = fileBuffer.toString().slice(0, 1000)

            if (isCSV(fileContent)) {
                detectedType = csvFileType
            } else if (isPlainText(fileContent)) {
                detectedType = txtFileType
            } else {
                // If it's not CSV or plain text and we couldn't detect it, consider it a mismatch
                return false
            }
        }
        return detectedType.mime === declaredMimeType
    } catch (err) {
        console.error(err)
        return err
    }
}

function isCSV(content: string): boolean {
    const lines = content.split('\n').slice(0, 5) // Check first 5 lines
    if (lines.length < 2) return false // Need at least 2 lines for a valid CSV

    const commaCount = lines[0].split(',').length
    if (commaCount < 2) return false // Need at least one comma for CSV

    // Check if all lines have the same number of commas
    return lines.every((line) => line.split(',').length === commaCount)
}

function isPlainText(content: string): boolean {
    // Check if the content contains only printable ASCII characters and common whitespace
    return /^[\x20-\x7E\t\n\r]*$/.test(content)
}

// CustomFileType adds 'csv' and 'txt' to mime types
interface CustomFileType {
    ext: 'csv' | 'txt'
    mime: 'text/csv' | 'text/plain'
}

type DetectedFileType = FileTypeResult | CustomFileType

const csvFileType: CustomFileType = {
    ext: 'csv',
    mime: 'text/csv',
}

const txtFileType: CustomFileType = {
    ext: 'txt',
    mime: 'text/plain',
}
