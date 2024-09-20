import path from 'path'
import crypto from 'crypto'
import { NewClamAV } from '../deps/clamAV'
import { mkdtemp, rm } from 'fs/promises'
import { NewTestS3UploadsClient } from '../deps/s3'
import { auditBucket } from './auditUploads'
import { generateVirusScanTagSet, virusScanStatus } from './tags'
import { NewLocalInfectedFilesLister } from '../lambdas/avAuditFiles'

describe('auditUploads', () => {
    it('will audit a bucket', async () => {
        const thisDir = __dirname

        const tmpDefsDir = await mkdtemp('/tmp/clamscan-')

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
                pathToDefintions: tmpDefsDir,
                isLocal: true,
            },
            s3Client
        )

        const fileScanner = NewLocalInfectedFilesLister(s3Client, clamAV)

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
        const badSourceFiles = ['badDummy.pdf', 'badList.csv'].map((name) =>
            path.join(testFilesToScanPath, name)
        )

        // make 20 random good files.
        for (let i = 0; i < 20; i++) {
            const goodFile = goodSourceFiles[i % goodSourceFiles.length]
            const goodfileExt = path.basename(goodFile).split('.')[1]
            const fileName = `${crypto.randomUUID()}.${goodfileExt}`

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

        // make two bad ones that were correctly tagged
        for (const badfile of badSourceFiles) {
            const badfileExt = path.basename(badfile).split('.')[1]

            const fileName = `${crypto.randomUUID()}.${badfileExt}`
            const testKey = path.join('allusers', fileName)
            const res = await s3Client.uploadObject(
                testKey,
                testBucketName,
                badfile
            )
            if (res) {
                throw res
            }

            const tags = generateVirusScanTagSet('INFECTED')
            const res2 = await s3Client.tagObject(testKey, testBucketName, tags)
            if (res2) {
                throw res2
            }
        }

        // make two bad ones that were incorrectly tagged
        const incorrectlyTaggedInfectedKeys = []
        for (const badfile of badSourceFiles) {
            const badfileExt = path.basename(badfile).split('.')[1]

            const fileName = `${crypto.randomUUID()}.${badfileExt}`
            const testKey = path.join('allusers', fileName)
            const res = await s3Client.uploadObject(
                testKey,
                testBucketName,
                badfile
            )
            if (res) {
                throw res
            }

            const tags = generateVirusScanTagSet('CLEAN')
            const res2 = await s3Client.tagObject(testKey, testBucketName, tags)
            if (res2) {
                throw res2
            }

            incorrectlyTaggedInfectedKeys.push(testKey)
        }

        // TEST
        // run auditor
        const improperlyTaggedFiles = await auditBucket(
            s3Client,
            fileScanner,
            testBucketName
        )
        if (improperlyTaggedFiles instanceof Error) {
            throw improperlyTaggedFiles
        }

        // check that the keys are now "INFECTED".
        for (const testKey of incorrectlyTaggedInfectedKeys) {
            const res2 = await s3Client.getObjectTags(testKey, testBucketName)
            if (res2 instanceof Error) {
                throw res2
            }

            expect(improperlyTaggedFiles).toContain(testKey)
            expect(virusScanStatus(res2)).toBe('INFECTED')
        }

        expect(improperlyTaggedFiles).toHaveLength(
            incorrectlyTaggedInfectedKeys.length
        )

        await rm(tmpDefsDir, { force: true, recursive: true })
    })
})
