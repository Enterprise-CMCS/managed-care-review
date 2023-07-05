import { main } from './migrate_rate_documents'
import * as migrate_rate_documents from './migrate_rate_documents'
import {
    ActuaryCommunicationType,
    DocumentCategoryType,
    RateCapitationType,
    RateType,
    SubmissionDocument,
} from 'app-web/src/common-code/healthPlanFormDataType'
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

    const extraRateInfos = [
        {
            id: 'test-rate-certification-one',
            rateType: 'AMENDMENT' as RateType,
            rateCapitationType: 'RATE_CELL' as RateCapitationType,
            rateDocuments: [
                {
                    s3URL: 's3://bucketname/key/foo.png',
                    name: 'rates cert 1',
                    documentCategories: [
                        'RATES_RELATED',
                    ] as DocumentCategoryType[],
                },
                {
                    s3URL: 's3://bucketname/key/foo.png',
                    name: 'rates cert 2',
                    documentCategories: [
                        'RATES_RELATED',
                    ] as DocumentCategoryType[],
                },
            ],
            supportingDocuments: [],
            rateDateStart: new Date(Date.UTC(2021, 4, 22)),
            rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
            rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
            rateAmendmentInfo: {
                effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
                effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
            },
            rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            rateCertificationName:
                'MCR-MN-0005-SNBC-RATE-20220621-20221021-AMENDMENT-20210523',
            actuaryContacts: [
                {
                    name: 'foo bar',
                    titleRole: 'manager',
                    email: 'soandso@example.com',
                    actuarialFirm: 'OTHER' as const,
                    actuarialFirmOther: 'ACME',
                },
                {
                    name: 'Fine Bab',
                    titleRole: 'supervisor',
                    email: 'lodar@example.com',
                    actuarialFirm: 'MERCER' as const,
                },
            ],
            actuaryCommunicationPreference:
                'OACT_TO_ACTUARY' as ActuaryCommunicationType,
            packagesWithSharedRateCerts: [],
        },
        {
            id: 'test-rate-certification-two',
            rateType: 'AMENDMENT' as RateType,
            rateCapitationType: 'RATE_CELL' as RateCapitationType,
            rateDocuments: [
                {
                    s3URL: 's3://bucketname/key/foo1.png',
                    name: 'rates cert 1',
                    documentCategories: [
                        'RATES_RELATED',
                    ] as DocumentCategoryType[],
                },
                {
                    s3URL: 's3://bucketname/key/foo2.png',
                    name: 'rates cert 2',
                    documentCategories: [
                        'RATES_RELATED',
                    ] as DocumentCategoryType[],
                },
            ],
            supportingDocuments: [],
            rateDateStart: new Date(Date.UTC(2021, 4, 22)),
            rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
            rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
            rateAmendmentInfo: {
                effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
                effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
            },
            rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51ggf'],
            rateCertificationName:
                'MCR-MN-0005-PMAP-RATE-20220621-20221021-AMENDMENT-20210523',
            actuaryContacts: [
                {
                    name: 'foo bar',
                    titleRole: 'manager',
                    email: 'soandso@example.com',
                    actuarialFirm: 'OTHER' as const,
                    actuarialFirmOther: 'ACME',
                },
                {
                    name: 'Fine Bab',
                    titleRole: 'supervisor',
                    email: 'lodar@example.com',
                    actuarialFirm: 'MERCER' as const,
                },
            ],
            actuaryCommunicationPreference:
                'OACT_TO_ACTUARY' as ActuaryCommunicationType,
            packagesWithSharedRateCerts: [],
        },
    ]

    function createRevisions(documents: SubmissionDocument[], id = 'mockId') {
        return [
            {
                id,
                createdAt: new Date(),
                pkgID: 'mockPkgID',
                formDataProto: Buffer.from(
                    toProtoBuffer({
                        ...unlockedWithALittleBitOfEverything(),
                        rateInfos: extraRateInfos,
                        documents,
                        id,
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

    function createBlankRevisions(
        documents: SubmissionDocument[],
        id = 'mockId'
    ) {
        return [
            {
                id,
                createdAt: new Date(),
                pkgID: 'mockPkgID',
                formDataProto: {} as Buffer,
                submittedAt: new Date(),
                unlockedAt: new Date(),
                unlockedBy: 'mockUnlockedBy',
                unlockedReason: 'mockUnlockedReason',
                submittedBy: 'mockSubmittedBy',
                submittedReason: 'mockSubmittedReason',
            },
            {
                id,
                createdAt: new Date(),
                pkgID: 'mockPkgID',
                formDataProto: Buffer.from(
                    toProtoBuffer({
                        ...unlockedWithALittleBitOfEverything(),
                        rateInfos: extraRateInfos,
                        documents,
                        id,
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

    it('should skip a revision with an error and handle all other revisions', async () => {
        // Create a revision with a rate related document
        const revisions: HealthPlanRevisionTable[] = createBlankRevisions([
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
    it('should skip submissions with no rate infos', async () => {
        const revisions: HealthPlanRevisionTable[] = [
            {
                id: 'mockId',
                createdAt: new Date(),
                pkgID: 'mockPkgID',
                formDataProto: Buffer.from(
                    toProtoBuffer({
                        ...unlockedWithALittleBitOfEverything(),
                        rateInfos: [],
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

        expect(updateHealthPlanRevisionSpy).not.toHaveBeenCalled()
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

        expect(updateHealthPlanRevisionSpy).toHaveBeenCalledTimes(1)

        const formData = updateHealthPlanRevisionSpy.mock.calls[0][2]
        // Check that Report12 is moved to rateInfos[0] and not present in documents
        expect(formData.rateInfos[0].supportingDocuments).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Report12 - SFY 2022 Preliminary MississippiCAN Capitation Rates - Exhibits.xlsx',
                }),
            ])
        )
        expect(formData.documents).toEqual(
            expect.not.arrayContaining([
                expect.objectContaining({
                    name: 'Report12 - SFY 2022 Preliminary MississippiCAN Capitation Rates - Exhibits.xlsx',
                }),
            ])
        )

        // Check that Report13 is moved to rateInfos[1] and not present in documents
        expect(formData.rateInfos[1].supportingDocuments).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Report13 - SFY 2023 Preliminary MississippiCAN Capitation Rates - Exhibits.xlsx',
                }),
            ])
        )
        expect(formData.documents).toEqual(
            expect.not.arrayContaining([
                expect.objectContaining({
                    name: 'Report13 - SFY 2023 Preliminary MississippiCAN Capitation Rates - Exhibits.xlsx',
                }),
            ])
        )

        // Check that the unrelated doc remains in documents and not in rateInfos
        expect(formData.documents).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'unrelated doc' }),
            ])
        )
        expect(formData.rateInfos).toEqual(
            expect.not.arrayContaining([
                expect.objectContaining({
                    supportingDocuments: expect.arrayContaining([
                        expect.objectContaining({ name: 'unrelated doc' }),
                    ]),
                }),
            ])
        )
    })
})
