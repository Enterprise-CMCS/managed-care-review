import { main } from './add_sha'
import * as add_sha from './add_sha'
import type { SubmissionDocument } from 'app-web/src/common-code/healthPlanFormDataType'
import { unlockedWithALittleBitOfEverything } from 'app-web/src/common-code/healthPlanFormDataMocks'
import type { Context } from 'aws-lambda'
import type { HealthPlanRevisionTable } from '@prisma/client'
import type { Store } from '../postgres'
import type { Event } from '@aws-sdk/client-s3'
import { toProtoBuffer } from 'app-web/src/common-code/proto/healthPlanFormDataProto'

const mockStore: Store = {
    findAllRevisions: jest.fn(),
    updateHealthPlanRevision: jest.fn(),
} as unknown as Store

jest.mock('@aws-sdk/client-secrets-manager', () => {
    return {
        SecretsManagerClient: jest.fn(() => {
            /* empty callback */
        }),
        GetSecretValueCommand: jest.fn(() => {
            /* empty callback */
        }),
    }
})

describe('add_sha', () => {
    beforeEach(() => {
        jest.resetAllMocks()
        jest.spyOn(add_sha, 'getDatabaseConnection').mockImplementation(() =>
            Promise.resolve(mockStore)
        )
        jest.spyOn(add_sha, 'calculateSHA256').mockImplementation(() => {
            return Promise.resolve('mockSHA256')
        })
    })

    function createRevisions(documents: SubmissionDocument[]) {
        return [
            {
                id: 'mockId',
                createdAt: new Date(),
                pkgID: 'mockPkgID',
                formDataProto: Buffer.from(
                    toProtoBuffer({
                        ...unlockedWithALittleBitOfEverything(),
                        documents,
                    })
                ),
                submittedAt: new Date(),
                unlockedAt: new Date(),
                unlockedBy: 'mockUnlockedBy',
                unlockedReason: 'mockUnlockedReason',
                submittedBy: 'mockSubmittedBy',
                submittedReason: 'mockSubmittedReason',
            },
        ]
    }

    it('should not overwrite a sha256 property when it already exists', async () => {
        // Create a revision with an existing sha256 property in the document
        const revisions: HealthPlanRevisionTable[] = createRevisions([
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                documentCategories: ['CONTRACT_RELATED'],
                sha256: 'doNotReplaceMe',
            },
        ])

        const storeFindAllRevisionsSpy = jest.spyOn(
            mockStore,
            'findAllRevisions'
        )
        storeFindAllRevisionsSpy.mockResolvedValue(revisions)

        const updateHealthPlanRevisionSpy = jest.spyOn(
            mockStore,
            'updateHealthPlanRevision'
        )

        await main({} as Event, {} as Context, () => {
            /*empty callback*/
        })

        // the sha should remain unchanged, and not be overwritten by the mock value defined above
        expect(updateHealthPlanRevisionSpy).toHaveBeenCalledWith(
            'mockPkgID',
            'mockId',
            expect.objectContaining({
                documents: expect.arrayContaining([
                    expect.objectContaining({
                        sha256: 'doNotReplaceMe',
                    }),
                ]),
            })
        )
    })
})
