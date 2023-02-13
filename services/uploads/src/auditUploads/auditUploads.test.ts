import path from 'path'
import crypto from 'crypto'
import { NewClamAV } from '../clamAV'
import { listFilesInDirectory } from '../fs'
import { mkdtemp, rm } from 'fs/promises'
import { NewTestS3UploadsClient } from '../s3'
import { updateAVDefinitions } from '../updateAVDefinitions'
import { auditBucket } from './auditUploads'
import { generateVirusScanTagSet, virusScanStatus } from '../tags'



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

        // clamupdate if necessary 
        const testDefs = await listFilesInDirectory(path.join(thisDir, '..', '..', 'local_buckets', 'test-av-definitions'))
        if (testDefs instanceof Error) {
            throw testDefs
        }

        console.log('RESTEDFE', testDefs)

        if (testDefs.length < 2) { // TODO should update this more often... or get them from elsewhere.
            console.info('TEST: Invoking Freshclam')

            const tmpdir = await mkdtemp('/tmp/freshclam-')
            console.log("TMP", tmpdir)

            const res = await updateAVDefinitions(s3Client, clamAV, tmpdir)
            if (res) {
                throw res
            }

            console.log('GOT BACK TO THE PLACdE')

            await rm(tmpdir, { force: true, recursive: true })
        }

        console.log('Time TO SCAN THEM FILES')

        const tmpScanDir = await mkdtemp('/tmp/scanFiles-')

        // ----done with clamscan

        // delete all objects from filesystem

        // do tags work?

        // upload test objects to s3
        // want a bunch of files, with one of them being DANGER
        

        // SETUP TEST DATA
        // Goal is to have a bunch of files in our bucket with some of them infected and some of them mistagged. 
        // Then we ensure we fix the tags on them

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
            console.log('SOURCE', goodFile, goodfileExt)
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
            console.log('SOURCE', badfile, badfileExt)

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
            console.log('SOURCE', badfile, badfileExt)

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
        const improperlyTaggedFiles = await auditBucket(s3Client, clamAV, 'test-uploads', tmpScanDir)
        if (improperlyTaggedFiles instanceof Error) {
            throw improperlyTaggedFiles
        }

        // check that the keys are now "INFECTED". 
        for (const testKey of incorrectlyTaggedInfectedKeys) {
            const res2 = await s3Client.getObjectTags(testKey, 'test-uploads')
            if (res2 instanceof Error) {
                throw res2
            }

            expect(virusScanStatus(res2)).toBe('INFECTED')
        }

        await rm(tmpDefsDir, { force: true, recursive: true })
        await rm(tmpScanDir, { force: true, recursive: true })

    })

})
