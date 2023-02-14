import { NewClamAV } from "./clamAV"
import { NewTestS3UploadsClient } from "./s3"
import { updateAVDefinitions } from "./updateAVDefinitions"
import { readdir, cp } from 'fs/promises'
import path from 'path'
import { uploadedAt } from "./tags"

describe('updateAVDefinitions', () => {
    it('can be called', async () => {

        console.info("OUR FILESNEM", __dirname)
        const thisDir = __dirname
        const testDir = path.join(thisDir, 'testDefinitions')

        const s3Client = NewTestS3UploadsClient()

        const clamAV = NewClamAV({
            bucketName: 'test-av-definitions',
            definitionsPath: 'lambda/s3-antivirus/av-definitions',

            pathToClamav: '/usr/local/clamav/bin/clamscan',
            pathToFreshclam: '/usr/local/clamav/bin/freshclam',
            pathToConfig: path.join(thisDir, 'testData', 'freshclam.conf'),
        }, s3Client)


        // freshclam is rate limited by the definitions server.
        // if the current freshclam data in s3 is less than a day old, replace the 
        // fetchAVDefinitionsWithFreshclam function with one that just copies in stashed files
        // If you want to test this repeatedly, delete those files and the test will run clean.
        const freshclamDatKey = path.join('lambda/s3-antivirus/av-definitions', 'freshclam.dat')

        const res = await s3Client.getObjectTags(freshclamDatKey, 'test-av-definitions')
        if (res instanceof Error && res.name !== 'NoSuchKey') {
            console.log('Error getting tags', res)
            return res
        } else if (!(res instanceof Error)) {
            console.log('HEAD OVJECT: ', res)

            const uploadedDate = uploadedAt(res)

            // This doesn't respect DST or leap anythings but is good enough for testing
            const aDayAgo = new Date(new Date().getTime() - (24 * 60 * 60 * 1000))

            // If this file was uploaded less than one day ago, we don't actually hit the server 
            // again and instead substitute this mock
            if (uploadedDate && uploadedDate > aDayAgo) {
                // Override the call to freshclam
                console.info('---Overriding Call To Freshclam Server---')
                clamAV.fetchAVDefinitionsWithFreshclam = async () => {
                    const sourceDefsDir = path.join(thisDir, 'clamAV', 'testDefinitions')
                    try {
                        const defs = await readdir(sourceDefsDir)
                        for (const def of defs) {
                            await cp(path.join(sourceDefsDir, def), path.join(testDir, def))
                        }
                    } catch (err) {
                        return err
                    }
                    return undefined
                }
            }
        }

        // add a superfluous file to s3 to confirm we are clearing the bucket every time.
        const superfluousFile = path.join(thisDir, 'clamAV', 'testData', 'dummy.pdf')
        const superfluousKey = path.join('lambda/s3-antivirus/av-definitions', 'dummy.pdf')
        const upload = s3Client.uploadObject(superfluousKey, 'test-av-definitions', superfluousFile)
        if (upload instanceof Error) {
            throw upload
        }

        console.log('Attempting to Upload Definitions')

        const err = await updateAVDefinitions(s3Client, clamAV, testDir)
        if (err) {
            throw err
        }

        // it should have cleared the superfluousFile
        const fetchRes = await s3Client.headObject(superfluousKey, 'test-av-definitions')
        expect(fetchRes).toBeInstanceOf(Error)
        if (!(fetchRes instanceof Error)) {
            throw new Error('bad type')
        }
        expect(fetchRes.name).toBe('NotFound')

        // it should have uploaded new files. 
        const freshDat = await s3Client.getObjectTags(freshclamDatKey, 'test-av-definitions')
        if (freshDat instanceof Error) {
            throw freshDat
        }
        const uploadedDat = uploadedAt(freshDat)
        if (uploadedDat instanceof Error) {
            throw uploadedDat
        }

        if (uploadedDat === undefined) {
            throw new Error('No uploaded At on freshclam.dat')
        }

        // this file should have been uploaded in the last two seconds
        const now = new Date()
        const diff = now.getTime() - uploadedDat.getTime()
        expect(diff).toBeLessThan(2000)


    }, 100000)


})
