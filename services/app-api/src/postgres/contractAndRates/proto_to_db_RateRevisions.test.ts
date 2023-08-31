import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { createMockRevisionsWithDocuments } from '../../testHelpers/protoMigratorHelpers'
import { decodeFormDataProto } from '../../handlers/proto_to_db'
import { v4 as uuidv4 } from 'uuid'
import { migrateRateInfo } from './proto_to_db_RateRevisions'
import type { SubmissionDocument } from 'app-web/src/common-code/healthPlanFormDataType'

describe('proto_to_db_RateRevisions', () => {
    it('migrates a rate revision', async () => {
        const client = await sharedTestPrismaClient()
        // Create a revision with a rate related document
        const revisions: SubmissionDocument[] = [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                documentCategories: ['RATES_RELATED'],
            },
        ]
        const mockRevision = createMockRevisionsWithDocuments(
            revisions,
            uuidv4()
        )

        const formData = decodeFormDataProto(mockRevision)
        if (formData instanceof Error) {
            throw new Error('formData should not be an Error')
        }

        const migratedRate = await migrateRateInfo(
            client,
            mockRevision,
            formData
        )
        if (migratedRate instanceof Error) {
            throw new Error('migreatedRate should not be an Error')
        }

        expect(migratedRate.rate).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
                stateCode: formData.stateCode,
                stateNumber: formData.stateNumber,
            })
        )

        const submitInfoID: string | null = null
        for (const rateInfo of formData.rateInfos) {
            for (const migratedRateRevision of migratedRate.rateRevisions) {
                expect(migratedRateRevision).toEqual(
                    expect.objectContaining({
                        id: expect.any(String),
                        rateID: mockRevision.pkgID,
                        createdAt: expect.any(Date),
                        updatedAt: expect.any(Date),
                        unlockInfoID: null,
                        submitInfoID: submitInfoID,
                        rateType: rateInfo.rateType,
                        rateCapitationType: rateInfo.rateCapitationType,
                        rateDateStart: rateInfo.rateDateStart,
                        rateDateEnd: rateInfo.rateDateEnd,
                        rateDateCertified: rateInfo.rateDateCertified,
                        amendmentEffectiveDateStart:
                            rateInfo.rateAmendmentInfo?.effectiveDateStart,
                        amendmentEffectiveDateEnd:
                            rateInfo.rateAmendmentInfo?.effectiveDateEnd,
                        rateProgramIDs: rateInfo.rateProgramIDs,
                        rateCertificationName: rateInfo.rateCertificationName,
                        actuaryCommunicationPreference:
                            rateInfo.actuaryCommunicationPreference,
                    })
                )
            }
        }
    })
})
