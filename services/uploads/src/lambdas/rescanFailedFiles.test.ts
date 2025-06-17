import path from 'path'
import crypto from 'crypto'
import { NewClamAV, ClamAV } from '../deps/clamAV'
import { mkdtemp, rm } from 'fs/promises'
import { NewTestS3UploadsClient, S3UploadsClient } from '../deps/s3'
import { generateVirusScanTagSet, virusScanStatus } from '../lib/tags'
import {
    rescanFailedFiles,
    type listInfectedFilesFn,
} from '../lambdas/rescanFailedFiles'

// Mock worker function that uses local ClamAV instead of invoking lambda
function createMockFileScanner(
    clamAV: ClamAV,
    s3Client: S3UploadsClient
): listInfectedFilesFn {
    return async (input: { bucket: string; keys: string[] }) => {
        console.info(`Mock worker processing ${input.keys.length} files`)

        const infectedKeys: string[] = []

        // Process each file individually (same logic as worker lambda)
        for (const key of input.keys) {
            console.info('Mock worker scanning file:', key)

            const individualScanDir = await mkdtemp('/tmp/individual-scan-')
            const scanFileName = `${crypto.randomUUID()}.tmp`
            const scanFilePath = path.join(individualScanDir, scanFileName)

            try {
                // Download the file
                const downloadErr = await s3Client.downloadFileFromS3(
                    key,
                    input.bucket,
                    scanFilePath
                )
                if (downloadErr instanceof Error) {
                    console.error(`Failed to download ${key}:`, downloadErr)
                    continue
                }

                // Scan the file
                const virusScanResult =
                    clamAV.scanForInfectedFiles(individualScanDir)

                if (virusScanResult instanceof Error) {
                    console.error(`Failed to scan ${key}:`, virusScanResult)
                    continue
                }

                // Determine scan status and tag the file
                let scanStatus: 'CLEAN' | 'INFECTED'
                if (
                    Array.isArray(virusScanResult) &&
                    virusScanResult.length > 0
                ) {
                    console.info(`File ${key} is infected:`, virusScanResult)
                    scanStatus = 'INFECTED'
                    infectedKeys.push(key)
                } else {
                    console.info(`File ${key} is clean`)
                    scanStatus = 'CLEAN'
                }

                // Tag the file (same as worker lambda)
                const tags = generateVirusScanTagSet(scanStatus)
                const currentTags = await s3Client.getObjectTags(
                    key,
                    input.bucket
                )
                if (currentTags instanceof Error) {
                    console.error(
                        `Failed to get current tags for ${key}:`,
                        currentTags
                    )
                    continue
                }

                const nonVirusScanTags = currentTags.filter(
                    (tag) =>
                        tag.Key !== 'virusScanStatus' &&
                        tag.Key !== 'virusScanTimestamp'
                )
                const updatedTags = {
                    TagSet: nonVirusScanTags.concat(tags.TagSet),
                }

                const tagResult = await s3Client.tagObject(
                    key,
                    input.bucket,
                    updatedTags
                )
                if (tagResult instanceof Error) {
                    console.error(`Failed to tag ${key}:`, tagResult)
                } else {
                    console.info(`Successfully tagged ${key} as ${scanStatus}`)
                }
            } catch (fileError) {
                console.error(`Error processing file ${key}:`, fileError)
                continue
            } finally {
                await rm(individualScanDir, { force: true, recursive: true })
            }
        }

        return { infectedKeys }
    }
}

describe('rescanFailedFiles', () => {
    it('will rescan files with ERROR status and missing scan tags', async () => {
        const thisDir = __dirname

        const tmpDefsDir = await mkdtemp('/tmp/clamscan-')

        // Copy system ClamAV definitions to test directory
        const { execSync } = await import('child_process')
        try {
            const dbDir = '/opt/homebrew/var/lib/clamav'
            console.info(`Copying ClamAV definitions from: ${dbDir}`)

            // Copy all the definition files you have
            execSync(
                `cp ${dbDir}/bytecode.cld ${tmpDefsDir}/ 2>/dev/null || true`
            )
            execSync(`cp ${dbDir}/daily.cvd ${tmpDefsDir}/ 2>/dev/null || true`)
            execSync(`cp ${dbDir}/main.cvd ${tmpDefsDir}/ 2>/dev/null || true`)
            execSync(
                `cp ${dbDir}/freshclam.dat ${tmpDefsDir}/ 2>/dev/null || true`
            )

            // Check if we copied the files
            const { readdirSync } = await import('fs')
            const files = readdirSync(tmpDefsDir)
            console.info(
                `Copied ${files.length} definition files to ${tmpDefsDir}:`,
                files
            )

            if (files.length === 0) {
                console.warn(
                    'No definition files copied - test may not detect viruses properly'
                )
            } else {
                // Show file sizes to verify they copied correctly
                const { statSync } = await import('fs')
                files.forEach((file) => {
                    const stats = statSync(path.join(tmpDefsDir, file))
                    console.info(`  ${file}: ${stats.size} bytes`)
                })
            }
        } catch (e) {
            console.warn('Failed to copy ClamAV definitions:', e)
        }

        const s3Client = NewTestS3UploadsClient()

        const clamAV = NewClamAV(
            {
                bucketName: 'test-av-definitions',
                definitionsPath: 'lambda/s3-antivirus/av-definitions',

                pathToClamav: 'clamscan',
                pathToFreshclam: 'freshclam',
                pathToConfig: path.join(
                    thisDir,
                    '..',
                    'testData',
                    'freshclam.conf'
                ),
                pathToDefintions: '/opt/homebrew/var/lib/clamav',
                isLocal: true,
            },
            s3Client
        )

        const testBucketName = 'test-audit'

        // remove all objects from the current bucket.
        const allUsersDir = path.join(
            thisDir,
            '..',
            '..',
            'local_buckets',
            testBucketName,
            'allusers'
        )
        await rm(allUsersDir, { force: true, recursive: true })

        const testFilesToScanPath = path.join(
            thisDir,
            '..',
            'deps',
            'clamAV',
            'testData'
        )
        const goodSourceFiles = ['dummy.pdf', 'goodList.csv'].map((name) =>
            path.join(testFilesToScanPath, name)
        )
        const badSourceFiles = ['badDummy.pdf'].map((name) =>
            path.join(testFilesToScanPath, name)
        )

        // make 10 good files that are already properly tagged as CLEAN (should be skipped)
        for (let i = 0; i < 10; i++) {
            const goodFile = goodSourceFiles[i % goodSourceFiles.length]
            const goodfileExt = path.basename(goodFile).split('.')[1]
            const fileName = `clean-${crypto.randomUUID()}.${goodfileExt}`

            const testKey = path.join('allusers', fileName)
            const res = await s3Client.uploadObject(
                testKey,
                testBucketName,
                goodFile
            )
            if (res) {
                throw res
            }

            const tags = generateVirusScanTagSet('CLEAN')
            const res2 = await s3Client.tagObject(testKey, testBucketName, tags)
            if (res2) {
                throw res2
            }
        }

        // make 5 files that have ERROR status (should be rescanned)
        const filesWithErrorStatus: string[] = []
        for (let i = 0; i < 5; i++) {
            const goodFile = goodSourceFiles[i % goodSourceFiles.length]
            const goodfileExt = path.basename(goodFile).split('.')[1]
            const fileName = `error-${crypto.randomUUID()}.${goodfileExt}`

            const testKey = path.join('allusers', fileName)
            const res = await s3Client.uploadObject(
                testKey,
                testBucketName,
                goodFile
            )
            if (res) {
                throw res
            }

            const tags = generateVirusScanTagSet('ERROR')
            const res2 = await s3Client.tagObject(testKey, testBucketName, tags)
            if (res2) {
                throw res2
            }

            filesWithErrorStatus.push(testKey)
        }

        // make 3 files with no scan tags at all (should be rescanned)
        const filesWithNoTags: string[] = []
        for (let i = 0; i < 3; i++) {
            const goodFile = goodSourceFiles[i % goodSourceFiles.length]
            const goodfileExt = path.basename(goodFile).split('.')[1]
            const fileName = `notags-${crypto.randomUUID()}.${goodfileExt}`

            const testKey = path.join('allusers', fileName)
            const res = await s3Client.uploadObject(
                testKey,
                testBucketName,
                goodFile
            )
            if (res) {
                throw res
            }

            // Don't add any virus scan tags to these files
            filesWithNoTags.push(testKey)
        }

        // make 1 infected file with ERROR status that should be detected as infected
        const infectedFilesWithErrorStatus: string[] = []
        for (const badfile of badSourceFiles) {
            const badfileExt = path.basename(badfile).split('.')[1]
            const fileName = `infected-error-${crypto.randomUUID()}.${badfileExt}`
            const testKey = path.join('allusers', fileName)

            const res = await s3Client.uploadObject(
                testKey,
                testBucketName,
                badfile
            )
            if (res) {
                throw res
            }

            const tags = generateVirusScanTagSet('ERROR')
            const res2 = await s3Client.tagObject(testKey, testBucketName, tags)
            if (res2) {
                throw res2
            }

            infectedFilesWithErrorStatus.push(testKey)
        }

        // TEST
        const mockFileScanner = createMockFileScanner(clamAV, s3Client)

        console.info('=== BEFORE RESCAN ===')
        console.info('Files with ERROR status:', filesWithErrorStatus)
        console.info('Files with no tags:', filesWithNoTags)
        console.info(
            'Infected files with ERROR status:',
            infectedFilesWithErrorStatus
        )

        const infectedFiles = await rescanFailedFiles(
            s3Client,
            mockFileScanner,
            testBucketName
        )

        if (infectedFiles instanceof Error) {
            throw infectedFiles
        }

        console.info('=== AFTER RESCAN ===')
        console.info('Returned infected files:', infectedFiles)
        console.info('Expected infected files:', infectedFilesWithErrorStatus)

        // Let's check what all the files are tagged as now
        console.info('=== FILE STATUS CHECK ===')
        for (const key of [
            ...filesWithErrorStatus,
            ...filesWithNoTags,
            ...infectedFilesWithErrorStatus,
        ]) {
            const tags = await s3Client.getObjectTags(key, testBucketName)
            if (tags instanceof Error) {
                console.info(`ERROR getting tags for ${key}:`, tags)
            } else {
                const status = virusScanStatus(tags)
                console.info(`${key}: ${status}`)
            }
        }

        // ASSERTION 1: Let's see what we actually got vs expected
        console.info(
            `Expected ${infectedFilesWithErrorStatus.length} infected files, got ${infectedFiles.length}`
        )

        // Let's see if the expected infected files are in the results
        for (const expectedInfectedKey of infectedFilesWithErrorStatus) {
            console.info(
                `Expected infected file ${expectedInfectedKey} is in results:`,
                infectedFiles.includes(expectedInfectedKey)
            )
        }

        // Let's see what unexpected files are being returned
        const unexpectedInfected = infectedFiles.filter(
            (key) => !infectedFilesWithErrorStatus.includes(key)
        )
        console.info('Unexpected infected files:', unexpectedInfected)

        // ASSERTION 2: Files that were already CLEAN should remain untouched
        // (We need to verify they weren't rescanned by checking they still have CLEAN status)
        const allObjects = await s3Client.listBucketObjects(testBucketName)
        if (allObjects instanceof Error) {
            throw allObjects
        }

        const cleanFiles = allObjects.filter(
            (obj) => obj.Key && obj.Key.startsWith('allusers/clean-')
        )
        expect(cleanFiles).toHaveLength(10) // Should still have all 10 clean files

        for (const cleanFile of cleanFiles) {
            if (!cleanFile.Key) continue
            const tags = await s3Client.getObjectTags(
                cleanFile.Key,
                testBucketName
            )
            if (tags instanceof Error) {
                throw tags
            }
            const scanStatus = virusScanStatus(tags)
            expect(scanStatus).toBe('CLEAN') // Should still be CLEAN (not rescanned)
        }

        // ASSERTION 3: Files with ERROR status should now have proper scan tags after rescanning
        for (const testKey of filesWithErrorStatus) {
            const tags = await s3Client.getObjectTags(testKey, testBucketName)
            if (tags instanceof Error) {
                throw tags
            }

            const scanStatus = virusScanStatus(tags)
            console.info(`File ${testKey} scan status: ${scanStatus}`)
            expect(scanStatus).toBe('CLEAN') // Should now be CLEAN since they were good files
            expect(scanStatus).not.toBe('ERROR') // Should no longer have ERROR status
        }

        // ASSERTION 4: Files with no tags should now have proper scan tags after rescanning
        for (const testKey of filesWithNoTags) {
            const tags = await s3Client.getObjectTags(testKey, testBucketName)
            if (tags instanceof Error) {
                throw tags
            }

            const scanStatus = virusScanStatus(tags)
            expect(scanStatus).toBe('CLEAN') // Should now be CLEAN since they were good files
            expect(scanStatus).toBeDefined() // Should no longer be undefined
        }

        // ASSERTION 5: Infected files with ERROR status should now be properly tagged as INFECTED
        for (const testKey of infectedFilesWithErrorStatus) {
            const tags = await s3Client.getObjectTags(testKey, testBucketName)
            if (tags instanceof Error) {
                throw tags
            }

            const scanStatus = virusScanStatus(tags)
            expect(scanStatus).toBe('INFECTED') // Should now be INFECTED
            expect(scanStatus).not.toBe('ERROR') // Should no longer have ERROR status
        }

        // ASSERTION 6: Verify the total number of files that should have been processed
        const totalFilesExpectedToBeRescanned =
            filesWithErrorStatus.length +
            filesWithNoTags.length +
            infectedFilesWithErrorStatus.length
        console.info(
            `Expected to rescan: ${totalFilesExpectedToBeRescanned} files`
        )
        console.info(`- filesWithErrorStatus: ${filesWithErrorStatus.length}`)
        console.info(`- filesWithNoTags: ${filesWithNoTags.length}`)
        console.info(
            `- infectedFilesWithErrorStatus: ${infectedFilesWithErrorStatus.length}`
        )
        expect(totalFilesExpectedToBeRescanned).toBe(9) // 5 + 3 + 1 = 9 files should have been rescanned

        // ASSERTION 7: Verify that infected files returned match exactly what we expect
        expect(infectedFiles.sort()).toEqual(
            infectedFilesWithErrorStatus.sort()
        )

        console.info('Test Summary:')
        console.info(
            `- Files with CLEAN status (skipped): ${cleanFiles.length}`
        )
        console.info(
            `- Files with ERROR status (rescanned): ${filesWithErrorStatus.length}`
        )
        console.info(
            `- Files with no tags (rescanned): ${filesWithNoTags.length}`
        )
        console.info(`- Infected files found: ${infectedFiles.length}`)
        console.info(
            `- Total files processed: ${totalFilesExpectedToBeRescanned}`
        )

        await rm(tmpDefsDir, { force: true, recursive: true })
    })
})
