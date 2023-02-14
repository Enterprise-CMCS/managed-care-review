import path from 'path'
import { NewTestS3UploadsClient } from '../s3'
import { NewClamAV, parseInfectedFiles } from './clamAV'
import { readdir, stat, mkdir } from 'fs/promises'


describe('clamAV', () => {

    it('parses clamscan output correctly', () => {

        const tests = [
            {
                output: `/Users/macrae/ccode/mc-review/managed-care-review/services/uploads/src/clamAV/testData/badList.csv: Win.Test.EICAR_HDB-1 FOUND
    /Users/macrae/ccode/mc-review/managed-care-review/services/uploads/src/clamAV/testData/dummy.pdf: OK
    /Users/macrae/ccode/mc-review/managed-care-review/services/uploads/src/clamAV/testData/goodList.csv: OK
    /Users/macrae/ccode/mc-review/managed-care-review/services/uploads/src/clamAV/testData/badDummy.pdf: Win.Test.EICAR_HDB-1 FOUND`,
                expected: ['badList.csv', 'badDummy.pdf']
            },
            {
                output: `/Users/macrae/ccode/mc-review/managed-care-review/services/uploads/src/clamAV/testData/dummy.pdf: OK
    /Users/macrae/ccode/mc-review/managed-care-review/services/uploads/src/clamAV/testData/goodList.csv: OK`,
                expected: []
            },
            {
                output: `/Users/macrae/ccode/mc-review/managed-care-review/services/uploads/src/clamAV/testData/badList.csv: Win.Test.EICAR_HDB-1 FOUND
    /Users/macrae/ccode/mc-review/managed-care-review/services/uploads/src/clamAV/testData/dummy.pdf: OK
    /Users/macrae/ccode/mc-review/managed-care-review/services/uploads/src/clamAV/testData/goodList.csv: OK`,
                expected: ['badList.csv']
            },
        ]

        for (const test of tests) {
            const res = parseInfectedFiles(test.output)
            expect(res).toStrictEqual(test.expected)
        }

    })



    it('returns a list of bad files when scanning a directory', async () => {
        const thisDir = __dirname

        const s3Client = NewTestS3UploadsClient()

        const definitionsDir = path.join(thisDir, 'testDefinitions')

        const clamAV = NewClamAV({
            bucketName: 'local-qa',
            definitionsPath: 'lambda/s3-antivirus/av-definitions',

            pathToClamav: '/usr/local/clamav/bin/clamscan',
            pathToFreshclam: '/usr/local/clamav/bin/freshclam',
            pathToConfig: path.join(thisDir, '..', 'testData', 'freshclam.conf'),
            pathToDefintions: definitionsDir,
        }, s3Client)

        // if the definitions dir doesn't exist, create it.
        try { 
            await stat(definitionsDir)
        } catch (err) {
            await mkdir(definitionsDir)
        }

        // if the files don't exist, download the files
        const theseDefs = await readdir(definitionsDir)
        if (theseDefs.length === 0) {
            // get the files
            const dlfiles = await clamAV.fetchAVDefinitionsWithFreshclam(definitionsDir)
            if (dlfiles instanceof Error) {
                throw dlfiles
            }
        }

        // have a list of files
        const testFilesDir = path.join(thisDir, 'testData')

        // call test files on it
        const res = clamAV.scanForInfectedFiles(testFilesDir)

        if (res instanceof Error) {
            throw res
        }
    
        // assert things. 
        expect(res).toStrictEqual(['badList.csv', 'badDummy.pdf'])

    })
}) 
