import path from 'path'
import { NewTestS3UploadsClient } from '../s3'
import { NewClamAV, parseInfectedFiles } from './clamAV'
import { rm, mkdtemp } from 'fs/promises'

describe('clamAV', () => {
    it('parses clamscan output correctly', () => {
        const tests = [
            {
                output: `/Users/alice/code/managed-care-review/services/uploads/src/clamAV/testData/badList.csv: Win.Test.EICAR_HDB-1 FOUND
    /Users/alice/code/managed-care-review/services/uploads/src/clamAV/testData/dummy.pdf: OK
    /Users/alice/code/managed-care-review/services/uploads/src/clamAV/testData/goodList.csv: OK
    /Users/alice/code/managed-care-review/services/uploads/src/clamAV/testData/badDummy.pdf: Win.Test.EICAR_HDB-1 FOUND`,
                expected: ['badList.csv', 'badDummy.pdf'],
            },
            {
                output: `/Users/alice/code/managed-care-review/services/uploads/src/clamAV/testData/dummy.pdf: OK
    /Users/alice/code/managed-care-review/services/uploads/src/clamAV/testData/goodList.csv: OK`,
                expected: [],
            },
            {
                output: `/Users/alice/code/managed-care-review/services/uploads/src/clamAV/testData/badList.csv: Win.Test.EICAR_HDB-1 FOUND
    /Users/alice/code/managed-care-review/services/uploads/src/clamAV/testData/dummy.pdf: OK
    /Users/alice/code/managed-care-review/services/uploads/src/clamAV/testData/goodList.csv: OK`,
                expected: ['badList.csv'],
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
        const tmpDefsDir = await mkdtemp('/tmp/freshclam-')

        const clamAV = NewClamAV(
            {
                bucketName: 'test-av-definitions',
                definitionsPath: 'lambda/s3-antivirus/av-definitions',

                pathToClamav: 'clamscan',
                pathToFreshclam: 'freshclam',
                pathToConfig: path.join(
                    thisDir,
                    '..',
                    '..',
                    'testData',
                    'freshclam.conf'
                ),
                pathToDefintions: tmpDefsDir,
                pathToClamdScan: 'clamscan',
                isLocal: true,
            },
            s3Client
        )

        const defsRes = await clamAV.downloadAVDefinitions()
        if (defsRes instanceof Error) {
            throw defsRes
        }

        // have a list of files
        const testFilesDir = path.join(thisDir, 'testData')

        // call test files on it
        const res = clamAV.scanForInfectedFiles(testFilesDir)

        if (res instanceof Error) {
            throw res
        }

        // assert things.
        expect(res).toEqual(['badDummy.pdf', 'badExcel.xls'])

        await rm(tmpDefsDir, { force: true, recursive: true })
    })
})
