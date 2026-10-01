import { describe, expect, it } from 'vitest'
import { buildSyntheticRateFormData } from '../src/builders/rate'

describe('buildSyntheticRateFormData', () => {
    it('builds a complete rate with sanitized synthetic contact data', () => {
        const formData = buildSyntheticRateFormData('program-1', {
            name: 'synthetic-rate.pdf',
            s3URL: 's3://synthetic-bucket/rate.pdf',
            s3Key: 'rate.pdf',
            bucket: 'synthetic-bucket',
            sha256: 'rate-sha',
        })

        expect(formData).toMatchObject({
            rateType: 'NEW',
            rateCapitationType: 'RATE_CELL',
            rateProgramIDs: ['program-1'],
            rateDocuments: [
                {
                    name: 'synthetic-rate.pdf',
                    s3URL: 's3://synthetic-bucket/rate.pdf',
                    sha256: 'rate-sha',
                },
            ],
            certifyingActuaryContacts: [
                expect.objectContaining({
                    email: 'synthetic.actuary@example.com',
                    actuarialFirm: 'MERCER',
                }),
            ],
        })
    })
})
