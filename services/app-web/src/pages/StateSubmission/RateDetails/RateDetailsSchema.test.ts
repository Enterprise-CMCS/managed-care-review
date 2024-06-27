import { RateDetailsFormSchema } from "./RateDetailsSchema"

describe('RateDetailsSchema', () => {

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
            await RateDetailsFormSchema().validate(badRateRev, {abortEarly: false})
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
            await RateDetailsFormSchema().validate(badRateRev, {abortEarly: false})
        } catch (err) {
            return
        }

        expect('Validator should have errored in this case').toBeUndefined()
    })

    it('checks empty linked rates', async () => {

        const badRateRev = {
            rateForms: [
                {
                    id: undefined,
                    rateType: 'NEW',
                    rateDocuments: [],
                    supportingDocuments: [],
                }
            ]
        }

        try {
            await RateDetailsFormSchema().validate(badRateRev, {abortEarly: false})
        } catch (err) {
            return
        }

        expect('Validator should have errored in this case').toBeUndefined()
    })
})
