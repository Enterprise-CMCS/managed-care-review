import { NewClamAV } from '../deps/clamAV'
import { NewTestS3UploadsClient } from '../deps/s3'
import { updateAVDefinitions } from './updateAVDefinitions'
import { readdir, cp } from 'fs/promises'
import path from 'path'
import { generateUploadedAtTagSet, uploadedAt } from './tags'

describe('updateAVDefinitions', () => {
    // This test will trample over other tests by deleting files in the test-av-definitions bucket,
    // so only run it when attempting to actually test updateAVDefinitions.
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('correctly updates the definition files', async () => {
        console.info('OUR FILESNEM', __dirname)
        const thisDir = __dirname
        const testDir = path.join(thisDir, 'testDefinitions')

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
            },
            s3Client
        )

        // freshclam is rate limited by the definitions server.
        // if the current freshclam data in s3 is less than a day old, replace the
        // fetchAVDefinitionsWithFreshclam function with one that just copies in stashed files
        // If you want to test this repeatedly, delete those files and the test will run clean.
        const freshclamDatKey = path.join(
            'lambda/s3-antivirus/av-definitions',
            'freshclam.dat'
        )

        const res = await s3Client.getObjectTags(
            freshclamDatKey,
            'test-av-definitions'
        )
        if (res instanceof Error && res.name !== 'NoSuchKey') {
            console.info('Error getting tags', res)
            return res
        } else if (!(res instanceof Error)) {
            const uploadedDate = uploadedAt(res)

            // This doesn't respect DST or leap anythings but is good enough for testing
            const aDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000)

            // If this file was uploaded less than one day ago, we don't actually hit the server
            // again and instead substitute this mock
            if (uploadedDate && uploadedDate > aDayAgo) {
                // Override the call to freshclam
                console.info('---Overriding Call To Freshclam Server---')
                clamAV.fetchAVDefinitionsWithFreshclam = async () => {
                    const sourceDefsDir = path.join(
                        thisDir,
                        '..',
                        'deps',
                        'clamAV',
                        'testDefinitions'
                    )
                    try {
                        const defs = await readdir(sourceDefsDir)
                        for (const def of defs) {
                            await cp(
                                path.join(sourceDefsDir, def),
                                path.join(testDir, def)
                            )
                        }
                    } catch (err) {
                        return err
                    }
                    return undefined
                }
            }
        }

        // add a superfluous file to s3 to confirm we are clearing the bucket every time.
        const superfluousFile = path.join(
            thisDir,
            '..',
            'deps',
            'clamAV',
            'testData',
            'dummy.pdf'
        )
        const superfluousKey = path.join(
            'lambda/s3-antivirus/av-definitions',
            'dummy.pdf'
        )
        const upload = s3Client.uploadObject(
            superfluousKey,
            'test-av-definitions',
            superfluousFile
        )
        if (upload instanceof Error) {
            throw upload
        }

        console.info('Attempting to Upload Definitions')

        const err = await updateAVDefinitions(s3Client, clamAV, testDir)
        if (err) {
            throw err
        }

        // it should have cleared the superfluousFile
        const fetchRes = await s3Client.headObject(
            superfluousKey,
            'test-av-definitions'
        )
        expect(fetchRes).toBeInstanceOf(Error)
        if (!(fetchRes instanceof Error)) {
            throw new Error('bad type')
        }
        expect(fetchRes.name).toBe('NotFound')

        // it should have uploaded new files.
        const freshDat = await s3Client.getObjectTags(
            freshclamDatKey,
            'test-av-definitions'
        )
        if (freshDat instanceof Error) {
            throw freshDat
        }
        const uploadedDate = uploadedAt(freshDat)
        if (uploadedDate instanceof Error) {
            throw uploadedDate
        }

        if (uploadedDate === undefined) {
            throw new Error('No uploaded At on freshclam.dat')
        }

        // this file should have been uploaded in the last two seconds
        const now = new Date()
        const diff = now.getTime() - uploadedDate.getTime()
        expect(diff).toBeLessThan(2000)
    }, 100000)

    it('doesnt generate invalid TagValues', async () => {
        const tags = generateUploadedAtTagSet()

        const value = tags.TagSet[0].Value
        // adapted from https://docs.aws.amazon.com/directoryservice/latest/devguide/API_Tag.html
        expect(value).toMatch(/^([\w\s\d_.:/=+\-@]*)$/)
    })
})
