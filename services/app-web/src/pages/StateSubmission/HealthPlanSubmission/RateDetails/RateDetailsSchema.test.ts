import { RateDetailsFormSchema } from './RateDetailsSchema'

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
                },
            ],
        }

        try {
            await RateDetailsFormSchema().validate(badRateRev, {
                abortEarly: false,
            })
        } catch {
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
                },
            ],
        }

        try {
            await RateDetailsFormSchema().validate(badRateRev, {
                abortEarly: false,
            })
        } catch {
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
                },
            ],
        }

        try {
            await RateDetailsFormSchema().validate(badRateRev, {
                abortEarly: false,
            })
        } catch {
            return
        }

        expect('Validator should have errored in this case').toBeUndefined()
    })

    it('rejects an actuary email without a top-level domain', async () => {
        const formValues = {
            rateForms: [
                {
                    ratePreviouslySubmitted: 'NO',
                    actuaryContacts: [
                        {
                            email: 'foo@bar',
                        },
                    ],
                },
            ],
        }

        await expect(
            RateDetailsFormSchema().validateAt(
                'rateForms[0].actuaryContacts[0].email',
                formValues
            )
        ).rejects.toMatchObject({
            errors: ['You must enter a valid email address'],
        })
    })

    it('accepts a valid actuary email', async () => {
        const formValues = {
            rateForms: [
                {
                    ratePreviouslySubmitted: 'NO',
                    actuaryContacts: [
                        {
                            email: 'actuary@example.com',
                        },
                    ],
                },
            ],
        }

        await expect(
            RateDetailsFormSchema().validateAt(
                'rateForms[0].actuaryContacts[0].email',
                formValues
            )
        ).resolves.toBe('actuary@example.com')
    })

    it.each(['actuaryContacts', 'addtlActuaryContacts'])(
        'rejects a null actuarial firm for %s',
        async (contactField) => {
            const formValues = {
                rateForms: [
                    {
                        ratePreviouslySubmitted: 'NO',
                        [contactField]: [
                            {
                                actuarialFirm: null,
                            },
                        ],
                    },
                ],
            }

            await expect(
                RateDetailsFormSchema().validateAt(
                    `rateForms[0].${contactField}[0].actuarialFirm`,
                    formValues
                )
            ).rejects.toMatchObject({
                errors: ['You must select an actuarial firm'],
            })
        }
    )

    it.each(['actuaryContacts', 'addtlActuaryContacts'])(
        'rejects a null description for an OTHER firm in %s',
        async (contactField) => {
            const formValues = {
                rateForms: [
                    {
                        ratePreviouslySubmitted: 'NO',
                        [contactField]: [
                            {
                                actuarialFirm: 'OTHER',
                                actuarialFirmOther: null,
                            },
                        ],
                    },
                ],
            }

            await expect(
                RateDetailsFormSchema().validateAt(
                    `rateForms[0].${contactField}[0].actuarialFirmOther`,
                    formValues
                )
            ).rejects.toMatchObject({
                errors: ['You must enter a description'],
            })
        }
    )
})
