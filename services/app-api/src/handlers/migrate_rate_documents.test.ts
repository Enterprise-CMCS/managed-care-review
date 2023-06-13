import { main } from './migrate_rate_documents'
import * as migrate_rate_documents from './migrate_rate_documents'
import { SubmissionDocument } from 'app-web/src/common-code/healthPlanFormDataType'
import { unlockedWithALittleBitOfEverything } from 'app-web/src/common-code/healthPlanFormDataMocks'
import { Context } from 'aws-lambda'
import { HealthPlanRevisionTable } from '@prisma/client'
import { Store } from '../postgres'
import { Event } from '@aws-sdk/client-s3'
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

describe('migrate_rate_documents', () => {
    beforeEach(() => {
        jest.resetAllMocks()
        jest.spyOn(
            migrate_rate_documents,
            'getDatabaseConnection'
        ).mockImplementation(() => Promise.resolve(mockStore))
    })

    function createRevisions(documents: SubmissionDocument[], id = 'mockId') {
        return [
            {
                id,
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

    it('should move rate related documents to rateInfos', async () => {
        // Create a revision with a rate related document
        const revisions: HealthPlanRevisionTable[] = createRevisions([
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                documentCategories: ['RATES_RELATED'],
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

        // the document should be moved to rateInfos
        expect(updateHealthPlanRevisionSpy).toHaveBeenCalledWith(
            'mockPkgID',
            'mockId',
            expect.objectContaining({
                rateInfos: expect.arrayContaining([
                    expect.objectContaining({
                        supportingDocuments: expect.arrayContaining([
                            expect.objectContaining({
                                name: 'contract doc',
                            }),
                        ]),
                    }),
                ]),
                documents: expect.not.arrayContaining([
                    expect.objectContaining({
                        name: 'contract doc',
                    }),
                ]),
            })
        )
    })

    it('should move specific documents to specific places in rateInfos', async () => {
        // Create a revision with two specific documents
        const revisions: HealthPlanRevisionTable[] = createRevisions(
            [
                {
                    s3URL: 's3://bucketname/key/foo.png',
                    name: 'Report12 - SFY 2022 Preliminary MississippiCAN Capitation Rates - Exhibits.xlsx',
                    documentCategories: ['RATES_RELATED'],
                },
                {
                    s3URL: 's3://bucketname/key/bar.png',
                    name: 'Report13 - SFY 2023 Preliminary MississippiCAN Capitation Rates - Exhibits.xlsx',
                    documentCategories: ['RATES_RELATED'],
                },
                {
                    s3URL: 's3://bucketname/key/baz.png',
                    name: 'unrelated doc',
                    documentCategories: ['CONTRACT'],
                },
            ],
            'ddd5dde1-0082-4398-90fe-89fc1bc148df'
        ) // This is the id specified in the handler for the special case

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

        // the first specific document should be moved to rateInfos[0]
        expect(updateHealthPlanRevisionSpy).toHaveBeenCalledWith(
            'mockPkgID',
            'mockId',
            expect.objectContaining({
                rateInfos: expect.arrayContaining([
                    {
                        supportingDocuments: expect.arrayContaining([
                            expect.objectContaining({
                                name: 'Report12 - SFY 2022 Preliminary MississippiCAN Capitation Rates - Exhibits.xlsx',
                            }),
                        ]),
                    },
                ]),
                documents: expect.not.arrayContaining([
                    expect.objectContaining({
                        name: 'Report12 - SFY 2022 Preliminary MississippiCAN Capitation Rates - Exhibits.xlsx',
                    }),
                ]),
            })
        )

        // the second specific document should be moved to rateInfos[1]
        expect(updateHealthPlanRevisionSpy).toHaveBeenCalledWith(
            'mockPkgID',
            'mockId',
            expect.objectContaining({
                rateInfos: expect.arrayContaining([
                    {
                        supportingDocuments: expect.arrayContaining([
                            expect.objectContaining({
                                name: 'Report13 - SFY 2023 Preliminary MississippiCAN Capitation Rates - Exhibits.xlsx',
                            }),
                        ]),
                    },
                ]),
                documents: expect.not.arrayContaining([
                    expect.objectContaining({
                        name: 'Report13 - SFY 2023 Preliminary MississippiCAN Capitation Rates - Exhibits.xlsx',
                    }),
                ]),
            })
        )

        // the unrelated document should not be moved
        expect(updateHealthPlanRevisionSpy).toHaveBeenCalledWith(
            'mockPkgID',
            'mockId',
            expect.objectContaining({
                documents: expect.arrayContaining([
                    expect.objectContaining({
                        name: 'unrelated doc',
                    }),
                ]),
                rateInfos: expect.not.arrayContaining([
                    expect.objectContaining({
                        supportingDocuments: expect.arrayContaining([
                            expect.objectContaining({
                                name: 'unrelated doc',
                            }),
                        ]),
                    }),
                ]),
            })
        )
    })
})
