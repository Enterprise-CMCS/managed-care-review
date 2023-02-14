import path from 'path'
import crypto from 'crypto'
import { NewClamAV } from '../clamAV'
import { listFilesInDirectory } from '../fs'
import { mkdtemp, rm } from 'fs/promises'
import { NewTestS3UploadsClient } from '../s3'
import { updateAVDefinitions } from '../updateAVDefinitions'
import { auditBucket } from './auditUploads'
import { generateVirusScanTagSet, virusScanStatus } from '../tags'
import { NewLocalInfectedFilesLister } from './scanFiles'



describe('auditUploads', () => {

    it('will audit a bucket', async () => {

        console.info("OUR FILESNEM", __dirname)
        const thisDir = __dirname

        const tmpDefsDir = await mkdtemp('/tmp/clamscan-')

        const s3Client = NewTestS3UploadsClient()

        const clamAV = NewClamAV({
            bucketName: 'test-av-definitions',
            definitionsPath: 'lambda/s3-antivirus/av-definitions',

            pathToClamav: '/usr/local/clamav/bin/clamscan',
            pathToFreshclam: '/usr/local/clamav/bin/freshclam',
            pathToConfig: path.join(thisDir, '..', 'testData', 'freshclam.conf'),
            pathToDefintions: tmpDefsDir,
        }, s3Client)

        const fileScanner = NewLocalInfectedFilesLister(s3Client, clamAV)

        // clamupdate if necessary 
        const testDefs = await listFilesInDirectory(path.join(thisDir, '..', '..', 'local_buckets', 'test-av-definitions'))
        if (testDefs instanceof Error) {
            throw testDefs
        }

        if (testDefs.length < 2) { // TODO should update this more often... or get them from elsewhere.
            console.info('TEST: Invoking Freshclam')

            const tmpdir = await mkdtemp('/tmp/freshclam-')

            const res = await updateAVDefinitions(s3Client, clamAV, tmpdir)
            if (res) {
                throw res
            }

            await rm(tmpdir, { force: true, recursive: true })
        }

        // remove all objects from the current bucket. 
        const allUsersDir = path.join(thisDir, '..','..', 'local_buckets', 'test-uploads', 'allusers')
        await rm(allUsersDir, { force: true, recursive: true })


        const testFilesToScanPath = path.join(thisDir, '..', 'clamAV', 'testData')
        const goodSourceFiles = ['dummy.pdf', 'goodList.csv'].map((name) => path.join(testFilesToScanPath, name))
        const badSourceFiles = ['badDummy.pdf', 'badList.csv'].map((name) => path.join(testFilesToScanPath, name))


        // make 20 random good files.
        for (let i = 0; i < 20; i++) {
            const goodFile = goodSourceFiles[i % goodSourceFiles.length]
            const goodfileExt = path.basename(goodFile).split('.')[1]
            const fileName = `${crypto.randomUUID()}.${goodfileExt}`

            const testKey = path.join('allusers', fileName)
            const res = await s3Client.uploadObject(testKey, 'test-uploads', goodFile)
            if (res) {
                throw res
            }

            const tags = generateVirusScanTagSet('CLEAN')
            const res2 = await s3Client.tagObject(testKey, 'test-uploads', tags)
            if (res2) {
                throw res2
            }
        }

        // make two bad ones that were correctly tagged
        for (const badfile of badSourceFiles) {
            const badfileExt = path.basename(badfile).split('.')[1]

            const fileName = `${crypto.randomUUID()}.${badfileExt}`
            const testKey = path.join('allusers', fileName)
            const res = await s3Client.uploadObject(testKey, 'test-uploads', badfile)
            if (res) {
                throw res
            }

            const tags = generateVirusScanTagSet('INFECTED')
            const res2 = await s3Client.tagObject(testKey, 'test-uploads', tags)
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
            const res = await s3Client.uploadObject(testKey, 'test-uploads', badfile)
            if (res) {
                throw res
            }

            const tags = generateVirusScanTagSet('CLEAN')
            const res2 = await s3Client.tagObject(testKey, 'test-uploads', tags)
            if (res2) {
                throw res2
            }

            incorrectlyTaggedInfectedKeys.push(testKey)
        }


        // TEST
        // run auditor
        const improperlyTaggedFiles = await auditBucket(s3Client, clamAV, fileScanner, 'test-uploads')
        if (improperlyTaggedFiles instanceof Error) {
            throw improperlyTaggedFiles
        }

        // check that the keys are now "INFECTED". 
        for (const testKey of incorrectlyTaggedInfectedKeys) {
            const res2 = await s3Client.getObjectTags(testKey, 'test-uploads')
            if (res2 instanceof Error) {
                throw res2
            }

            expect(improperlyTaggedFiles).toContain(testKey)
            expect(virusScanStatus(res2)).toBe('INFECTED')
        }

        expect(improperlyTaggedFiles.length).toEqual(incorrectlyTaggedInfectedKeys.length)

        await rm(tmpDefsDir, { force: true, recursive: true })

    })

})
