import type { GraphQLResolveInfo } from 'graphql'
import type { Context } from '../../handlers/apollo_gql'
import type { S3ObjectInput } from '../../gen/gqlServer'
import { testS3Client } from '../../testHelpers/s3Helpers'
import {
    fetchUploadScanStatusResolver,
    fetchS3DownloadURLResolver,
} from './sharedS3Objects'

const context: Context = {
    user: {
        id: 'cms-user',
        role: 'CMS_USER',
        email: 'cms@example.com',
        givenName: 'CMS',
        familyName: 'User',
        stateAssignments: [],
    },
}
const info = {} as GraphQLResolveInfo

describe('shared S3 object resolvers', () => {
    const s3 = testS3Client()
    const scan = fetchUploadScanStatusResolver(s3)
    const download = fetchS3DownloadURLResolver(s3)
    if (typeof scan !== 'function' || typeof download !== 'function') {
        throw new Error('Expected resolver functions')
    }
    const input: S3ObjectInput = {
        key: 'allusers/upload.pdf',
        bucketName: 'QUESTION_ANSWER_DOCS',
    }

    beforeEach(() => vi.restoreAllMocks())

    it('returns scan status for an unsaved shared upload, without downloading it', async () => {
        const status = vi
            .spyOn(s3, 'getScanStatus')
            .mockResolvedValue('PENDING')
        const getURL = vi.spyOn(s3, 'getURL')
        expect(await scan({}, { input }, context, info)).toBe('PENDING')
        expect(status).toHaveBeenCalledWith(
            'upload.pdf',
            'QUESTION_ANSWER_DOCS'
        )
        status.mockResolvedValue('CLEAN')
        expect(await scan({}, { input }, context, info)).toBe('CLEAN')
        expect(getURL).not.toHaveBeenCalled()
    })

    it('signs shared downloads and document ZIPs in their allowed buckets', async () => {
        const getURL = vi.spyOn(s3, 'getURL')
        const getZipURL = vi.spyOn(s3, 'getZipURL')
        await download({}, { input }, context, info)
        expect(getURL).toHaveBeenCalledWith(
            'upload.pdf',
            'QUESTION_ANSWER_DOCS',
            3600
        )
        const zip = {
            key: 'zips/rates/rate-123/rate-documents.zip',
            bucketName: 'HEALTH_PLAN_DOCS' as const,
        }
        await download({}, { input: zip }, context, info)
        expect(getZipURL).toHaveBeenCalledWith(zip.key, zip.bucketName)
        await expect(
            download(
                {},
                { input: { ...zip, bucketName: 'QUESTION_ANSWER_DOCS' } },
                context,
                info
            )
        ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } })
    })

    it.each([
        'private/secret.pdf',
        'allusers/../secret.pdf',
        'zips/rates/id/file.zip',
    ])('rejects scan keys outside flat shared uploads: %s', async (key) => {
        const status = vi.spyOn(s3, 'getScanStatus')
        await expect(
            scan({}, { input: { ...input, key } }, context, info)
        ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } })
        expect(status).not.toHaveBeenCalled()
    })

    it('rejects OAuth callers without read permission before touching S3', async () => {
        const denied: Context = {
            ...context,
            oauthClient: {
                clientId: 'client',
                iss: 'issuer',
                grants: [],
                scopes: [],
                isDelegatedUser: false,
            },
        }
        const status = vi.spyOn(s3, 'getScanStatus')
        const getURL = vi.spyOn(s3, 'getURL')
        await expect(scan({}, { input }, denied, info)).rejects.toMatchObject({
            extensions: { code: 'FORBIDDEN' },
        })
        await expect(
            download({}, { input }, denied, info)
        ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } })
        expect(status).not.toHaveBeenCalled()
        expect(getURL).not.toHaveBeenCalled()
    })
})
