import path from 'path'
import crypto from 'crypto'
import { mkdtemp, rm } from 'fs/promises'
import { NewClamAV } from '../deps/clamAV'
import { NewTestS3UploadsClient } from '../deps/s3'
import { scanFile } from './avScan'
import { virusScanStatus } from './tags'

const MAX_FILE_SIZE = 314572800

describe('avScan', () => {
    it('tags clean for a clean file', async () => {
        const thisDir = __dirname
        const tmpDefsDir = await mkdtemp('/tmp/freshclam-')

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

        const goodFile = path.join(
            thisDir,
            '..',
            'deps',
            'clamAV',
            'testData',
            'dummy.pdf'
        )
        const goodFileKey = path.join('allusers', crypto.randomUUID())

        const res = await s3Client.uploadObject(
            goodFileKey,
            'test-uploads',
            goodFile
        )
        if (res) {
            throw res
        }

        // TEST
        // run check file
        const scanResult = await scanFile(
            s3Client,
            clamAV,
            goodFileKey,
            'test-uploads',
            MAX_FILE_SIZE
        )
        if (scanResult instanceof Error) {
            throw scanResult
        }

        console.info('SCANNED')

        // check tags
        const res2 = await s3Client.getObjectTags(goodFileKey, 'test-uploads')
        if (res2 instanceof Error) {
            throw res2
        }

        expect(virusScanStatus(res2)).toBe('CLEAN')

        await rm(tmpDefsDir, { force: true, recursive: true })
    })

    it('marks infected for an infected file', async () => {
        const thisDir = __dirname
        const tmpDefsDir = await mkdtemp('/tmp/freshclam-')

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

        const badFile = path.join(
            thisDir,
            '..',
            'deps',
            'clamAV',
            'testData',
            'badDummy.pdf'
        )
        const badFileKey = path.join('allusers', crypto.randomUUID())

        const res = await s3Client.uploadObject(
            badFileKey,
            'test-uploads',
            badFile
        )
        if (res) {
            throw res
        }

        // TEST
        // run check file
        const scanResult = await scanFile(
            s3Client,
            clamAV,
            badFileKey,
            'test-uploads',
            MAX_FILE_SIZE
        )
        if (scanResult instanceof Error) {
            throw scanResult
        }

        console.info('SCANNED')

        // check tags
        const res2 = await s3Client.getObjectTags(badFileKey, 'test-uploads')
        if (res2 instanceof Error) {
            throw res2
        }

        expect(virusScanStatus(res2)).toBe('INFECTED')

        await rm(tmpDefsDir, { force: true, recursive: true })
    })

    it('marks skipped for too big a file (config a smaller max size)', async () => {
        const thisDir = __dirname
        const tmpDefsDir = await mkdtemp('/tmp/freshclam-')

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

        const badFile = path.join(
            thisDir,
            '..',
            'deps',
            'clamAV',
            'testData',
            'badDummy.pdf'
        )
        const badFileKey = path.join('allusers', crypto.randomUUID())

        const res = await s3Client.uploadObject(
            badFileKey,
            'test-uploads',
            badFile
        )
        if (res) {
            throw res
        }

        // TEST
        // run check file
        const scanResult = await scanFile(
            s3Client,
            clamAV,
            badFileKey,
            'test-uploads',
            2
        )
        if (scanResult instanceof Error) {
            throw scanResult
        }

        console.info('SCANNED')

        // check tags
        const res2 = await s3Client.getObjectTags(badFileKey, 'test-uploads')
        if (res2 instanceof Error) {
            throw res2
        }

        expect(virusScanStatus(res2)).toBe('SKIPPED')

        await rm(tmpDefsDir, { force: true, recursive: true })
    })

    it('marks error if ClamAV errors', async () => {
        const thisDir = __dirname
        const tmpDefsDir = await mkdtemp('/tmp/freshclam-')

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

        clamAV.scanForInfectedFiles = () => {
            return new Error('test unexpected error')
        }

        const badFile = path.join(
            thisDir,
            '..',
            'deps',
            'clamAV',
            'testData',
            'badDummy.pdf'
        )
        const badFileKey = path.join('allusers', crypto.randomUUID())

        const res = await s3Client.uploadObject(
            badFileKey,
            'test-uploads',
            badFile
        )
        if (res) {
            throw res
        }

        // TEST
        // run check file
        const scanResult = await scanFile(
            s3Client,
            clamAV,
            badFileKey,
            'test-uploads',
            MAX_FILE_SIZE
        )
        if (scanResult instanceof Error) {
            throw scanResult
        }

        console.info('SCANNED')

        // check tags
        const res2 = await s3Client.getObjectTags(badFileKey, 'test-uploads')
        if (res2 instanceof Error) {
            throw res2
        }

        expect(virusScanStatus(res2)).toBe('ERROR')

        await rm(tmpDefsDir, { force: true, recursive: true })
    })

    it('returns not found if the key doesnt exist', async () => {
        const thisDir = __dirname
        const tmpDefsDir = await mkdtemp('/tmp/freshclam-')

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

        const badFileKey = path.join('allusers', crypto.randomUUID())

        // TEST
        // run check file
        const scanResult = await scanFile(
            s3Client,
            clamAV,
            badFileKey,
            'test-uploads',
            MAX_FILE_SIZE
        )
        if (!(scanResult instanceof Error)) {
            throw new Error('Didnt error on a nonexistant file')
        }
        expect(scanResult.name).toBe('NotFound')

        await rm(tmpDefsDir, { force: true, recursive: true })
    })
})
