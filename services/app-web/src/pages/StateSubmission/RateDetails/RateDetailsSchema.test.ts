import { RateDetailsFormSchema } from "./RateDetailsSchema"

describe('RateDetailsSchema', () => {
    
    it('Skips validating previously submitted rates', async () => {
        
        const badRateRev = {
            rateForms: [
                {
                    id: 'fooba',
                    rateType: 'NEW',
                    rateDocuments: [],
                    supportingDocuments: [],
                    ratePreviouslySubmitted: 'YES',
                }
            ],
            actuaryCommunicationPreference: 'OACT_TO_ACTUARY'
        }

        const res = await RateDetailsFormSchema({'link-rates': true}).validate(badRateRev, {abortEarly: false})
        expect(res.rateForms?.[0].ratePreviouslySubmitted).toBe('YES')
    })

    it('checks child rates', async () => {
        
        const badRateRev = {
            rateForms: [
                {
                    id: 'fooba',
                    rateType: 'NEW',
                    rateDocuments: [],
                    supportingDocuments: [],
                    ratePreviouslySubmitted: 'NO',
                }
            ]
        }

        try {
            await RateDetailsFormSchema({'link-rates': true}).validate(badRateRev, {abortEarly: false})
        } catch (err) {
            return
        }

        expect('Validator should have errored in this case').toBeUndefined()
    })

    it('checks unspecified rates', async () => {
        
        const badRateRev = {
            rateForms: [
                {
                    id: 'fooba',
                    rateType: 'NEW',
                    rateDocuments: [],
                    supportingDocuments: [],
                }
            ]
        }

        try {
            await RateDetailsFormSchema({'link-rates': true}).validate(badRateRev, {abortEarly: false})
        } catch (err) {
            return
        }

        expect('Validator should have errored in this case').toBeUndefined()
    })
})
