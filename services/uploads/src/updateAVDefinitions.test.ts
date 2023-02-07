import { NewClamAV } from "./clamAV"
import { NewTestS3UploadsClient } from "./s3"
import { updateAVDefinitions } from "./updateAVDefinitions"
import path from 'path'

describe('updateAVDefinitions', () => {
    it('can be called', async () => {

        console.info("OUR FILESNEM", __dirname)
        const thisDir = __dirname
        const testDir = path.join(thisDir, 'testDefinitions')

        const s3Client = NewTestS3UploadsClient()

        const clamAV = NewClamAV({
            bucketName: 'local-qa',
            definitionsPath: 'lambda/s3-antivirus/av-definitions',

            pathToClamav: '/usr/local/clamav/bin/clamscan',
            pathToFreshclam: '/usr/local/clamav/bin/freshclam',
            pathToConfig: path.join(thisDir, 'testData', 'freshclam.conf'),
        }, s3Client)

        // override the call for now
        clamAV.fetchAVDefinitionsWithFreshclam = async () => undefined

        const err = await updateAVDefinitions(s3Client, clamAV, testDir)

        if (err) {
            throw err
        }

        // do we care about getting rate limited?
        // run the updater, 
        // modify s3
        // s3 files should be updated 

        throw new Error('NOPE')
    })


})
