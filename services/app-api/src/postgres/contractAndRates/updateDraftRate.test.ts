import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftRate } from './insertRate'
import { must } from '../../testHelpers'
import { updateDraftRate} from './updateDraftRate'
import { PrismaClientValidationError } from '@prisma/client/runtime/library'

import type  { RateFormEditable } from './updateDraftRate'
import type { RateType } from '@prisma/client'

describe('updateDraftRate', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('updates drafts correctly', async () => {
        const client = await sharedTestPrismaClient()

        const draftRateForm1 = { rateCertificationName: 'draftData' }

        const rate = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                ...draftRateForm1,
            })
        )

        const draftRateForm2 = { rateCertificationName: 'something else' }
        const draft = must(
            await updateDraftRate(client, {
                rateID: rate.id,
                formData: draftRateForm2,
                contractIDs: [],
            })
        )

        expect(draft.draftRevision).toBeDefined()
        expect(draft.draftRevision?.formData.rateCertificationName).toBe(
            'something else'
        )
    })

    it(
        'updates linked documents as expected in multiple requests'
    , async () => {
        const client = await sharedTestPrismaClient()

        const draftRateForm1: Partial<RateFormEditable> = {
            rateCertificationName: 'draftData1',
            rateDocuments: [
                {
                    s3URL: 's3://bucketname/key/rate1',
                    name: 'Rate cert 1',
                },
            ],
            supportingDocuments: [
                {
                    s3URL: 's3://bucketname/key/ratesupporting1-1',
                    name: 'supporting documents 1-1',
                },
               ]
        }
        // documents all replaced, additional supporting docs added
        const draftRateForm2: Partial<RateFormEditable> = { rateCertificationName: 'draftData2',
        rateDocuments: [
            {
                s3URL: 's3://bucketname/key/rate2',
                name: 'Rate cert 2',
            },
        ],
        supportingDocuments: [
            {
                s3URL: 's3://bucketname/key/ratesupporting2-1',
                name: 'supporting documents 2-1',
            },
            {
                s3URL:  's3://bucketname/key/ratesupporting2-2',
                name: 'supporting documents2-2',
            }]
         }

         // documents unchanged
         const draftRateForm3: Partial<RateFormEditable> = {
            rateCertificationName: 'draftData3',
            rateDocuments: draftRateForm2.rateDocuments,
            supportingDocuments: draftRateForm1.supportingDocuments
        }


        const rate = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
            })
        )


        const draft1 = must(
            await updateDraftRate(client, {
                rateID: rate.id,
                formData: draftRateForm1,
                contractIDs: [],
            })
        )


        expect(draft1.draftRevision?.formData.rateDocuments).toHaveLength(1)
        expect(draft1.draftRevision?.formData.rateDocuments).toHaveLength(1)


        const draft2 = must(
            await updateDraftRate(client, {
                rateID: rate.id,
                formData: draftRateForm2,
                contractIDs: [],
            })
        )

        expect(draft2.draftRevision?.formData.rateCertificationName).toBe(
            'draftData2'
        )

        expect(draft2.draftRevision?.formData.rateDocuments).toHaveLength(1)
        expect(draft2.draftRevision?.formData.supportingDocuments).toHaveLength(2)
        expect(draft2.draftRevision?.formData.rateDocuments).toBe(expect.arrayContaining(expect.objectContaining({
            s3URL: 's3://bucketname/key/rate2',
            name: 'Rate cert 2',
        })))
        expect(draft2.draftRevision?.formData.supportingDocuments).toBe(expect.arrayContaining(expect.objectContaining({
            s3URL: 's3://bucketname/key/ratesupporting2-1',
            name: 'supporting documents 2-1',
        })))

        expect(draft2.draftRevision?.formData.supportingDocuments).toBe(expect.arrayContaining(expect.objectContaining({
            s3URL: 's3://bucketname/key/ratesupporting2-2',
            name: 'supporting documents 2-2',
        })))

        const draft3 = must(
            await updateDraftRate(client, {
                rateID: rate.id,
                formData: draftRateForm3,
                contractIDs: [],
            })
        )
        expect(draft3.draftRevision?.formData.rateCertificationName).toBe(
            'draftData3'
        )
        expect(draft3.draftRevision?.formData.rateDocuments).toHaveLength(1)
        expect(draft3.draftRevision?.formData.supportingDocuments).toHaveLength(2)
        expect(draft3.draftRevision?.formData.rateDocuments).toBe(expect.arrayContaining(expect.objectContaining({
            s3URL: 's3://bucketname/key/rate2',
            name: 'Rate cert 2',
        })))
        expect(draft3.draftRevision?.formData.supportingDocuments).toBe(expect.arrayContaining(expect.objectContaining({
            s3URL: 's3://bucketname/key/ratesupporting2-1',
            name: 'supporting documents 2-1',
        })))

        expect(draft3.draftRevision?.formData.supportingDocuments).toBe(expect.arrayContaining(expect.objectContaining({
            s3URL: 's3://bucketname/key/ratesupporting2-2',
            name: 'supporting documents 2-2',
        })))
    })

    it('updates linked contact table as expected in multiple requests', async() => {
        const client = await sharedTestPrismaClient()
        const draftRateForm1: Partial<RateFormEditable> = {
            rateCertificationName: 'draftData1',
            certifyingActuaryContacts: [
                {
                    actuarialFirm: 'MERCER',
                    name: 'Certifying Actuary 1',
                    titleRole: 'Test Certifying Actuary 1',
                    email: 'certifying1@example.com',
                },
            ],
            addtlActuaryContacts: [
                {
                    actuarialFirm: 'MERCER',
                    name: 'Certifying Actuary 1',
                    titleRole: 'Test Certifying Actuary 1',
                    email: 'certifying1@example.com',
                },
               ]
        }
        // documents all replaced, additional supporting docs added
        const draftRateForm2: Partial<RateFormEditable> = { rateCertificationName: 'draftData2',
        certifyingActuaryContacts: [
            {
                actuarialFirm: 'MERCER',
                name: 'Certifying Actuary 2',
                titleRole: 'Test Certifying Actuary 2',
                email: 'certifying2@example.com',
            },
        ],
        addtlActuaryContacts: [
            {
                actuarialFirm: 'MERCER',
                name: 'Certifying Actuary 2',
                titleRole: 'Test Certifying Actuary 2',
                email: 'certifying2@example.com',
            },
           ]
         }

         // documents unchanged
         const draftRateForm3: Partial<RateFormEditable> = {
            rateCertificationName: 'draftData3',
            certifyingActuaryContacts: draftRateForm2.certifyingActuaryContacts,
            addtlActuaryContacts: draftRateForm1.addtlActuaryContacts
        }


        const rate = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
            })
        )


        const draft1 = must(
            await updateDraftRate(client, {
                rateID: rate.id,
                formData: draftRateForm1,
                contractIDs: [],
            })
        )


        expect(draft1.draftRevision?.formData.rateDocuments).toHaveLength(1)
        expect(draft1.draftRevision?.formData.rateDocuments).toHaveLength(1)


        const draft2 = must(
            await updateDraftRate(client, {
                rateID: rate.id,
                formData: draftRateForm2,
                contractIDs: [],
            })
        )

        expect(draft2.draftRevision?.formData.rateCertificationName).toBe(
            'draftData2'
        )

        expect(draft2.draftRevision?.formData.rateDocuments).toHaveLength(1)
        expect(draft2.draftRevision?.formData.supportingDocuments).toHaveLength(2)
        expect(draft2.draftRevision?.formData.rateDocuments).toBe(expect.arrayContaining(expect.objectContaining({
            s3URL: 's3://bucketname/key/rate2',
            name: 'Rate cert 2',
        })))
        expect(draft2.draftRevision?.formData.supportingDocuments).toBe(expect.arrayContaining(expect.objectContaining({
            s3URL: 's3://bucketname/key/ratesupporting2-1',
            name: 'supporting documents 2-1',
        })))

        expect(draft2.draftRevision?.formData.supportingDocuments).toBe(expect.arrayContaining(expect.objectContaining({
            s3URL: 's3://bucketname/key/ratesupporting2-2',
            name: 'supporting documents 2-2',
        })))

        const draft3 = must(
            await updateDraftRate(client, {
                rateID: rate.id,
                formData: draftRateForm3,
                contractIDs: [],
            })
        )
        expect(draft3.draftRevision?.formData.rateCertificationName).toBe(
            'draftData3'
        )
        expect(draft3.draftRevision?.formData.rateDocuments).toHaveLength(1)
        expect(draft3.draftRevision?.formData.supportingDocuments).toHaveLength(2)
        expect(draft3.draftRevision?.formData.rateDocuments).toBe(expect.arrayContaining(expect.objectContaining({
            s3URL: 's3://bucketname/key/rate2',
            name: 'Rate cert 2',
        })))
        expect(draft3.draftRevision?.formData.supportingDocuments).toBe(expect.arrayContaining(expect.objectContaining({
            s3URL: 's3://bucketname/key/ratesupporting2-1',
            name: 'supporting documents 2-1',
        })))

        expect(draft3.draftRevision?.formData.supportingDocuments).toBe(expect.arrayContaining(expect.objectContaining({
            s3URL: 's3://bucketname/key/ratesupporting2-2',
            name: 'supporting documents 2-2',
        })))
    })

    it('returns an error when invalid form data for rate type provided', async () => {
        jest.spyOn(console, 'error').mockImplementation()
        const client = await sharedTestPrismaClient()
        const newRate = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
            })
        )
        // use type coercion to pass in bad data
        const updatedRate = await updateDraftRate(client, {
            rateID: newRate.id,
            formData: {
                rateCertificationName: 'a new rate',
                rateType: 'BASE' as RateType,
            },
            contractIDs: [],
        })

        // Expect a prisma error
        expect(updatedRate).toBeInstanceOf(PrismaClientValidationError)
    })

    it('returns an error when invalid rate ID provided', async () => {
        jest.spyOn(console, 'error').mockImplementation()
        const client = await sharedTestPrismaClient()

        const draftRate = await updateDraftRate(client, {
            rateID: 'not-real-id',
            formData: {
                rateCertificationName: 'a new rate',
                rateType: 'AMENDMENT',
            },
            contractIDs: [],
        })

        // Expect a prisma error
        expect(draftRate).toBeInstanceOf(Error) // eventually should be PrismaClientKnownRequestError
    })
})
