import {
    testEmailConfig,
    testStateAnalystsEmails,
    testDuplicateEmailConfig,
    testDuplicateStateAnalystsEmails,
    mockContractAmendmentFormData,
    mockContractOnlyFormData,
    mockContractAndRatesFormData,
    mockMNState,
    mockMSState,
} from '../../testHelpers/emailerHelpers'
import type { LockedHealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import {
    generateRateName,
    packageName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { newPackageCMSEmail } from './index'

test('to addresses list includes review team email addresses', async () => {
    const sub = mockContractOnlyFormData()
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    testEmailConfig().devReviewTeamEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('to addresses list includes OACT and DMCP group emails for contract and rate package', async () => {
    const sub = mockContractAndRatesFormData()
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    testEmailConfig().oactEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })

    testEmailConfig().dmcpEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })

    // do not include dmco group emails - rely on state analysts instead
    testEmailConfig().dmcoEmails.forEach((emailAddress) => {
        expect(template).not.toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('to addresses list  does not include OACT and DMCP group emails for CHIP submission', async () => {
    const sub = mockContractOnlyFormData({ populationCovered: 'CHIP' })
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    testEmailConfig().oactEmails.forEach((emailAddress) => {
        expect(template).not.toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })

    testEmailConfig().dmcpEmails.forEach((emailAddress) => {
        expect(template).not.toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('to addresses list does not include help addresses', async () => {
    const sub = mockContractOnlyFormData()
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            toAddresses: expect.not.arrayContaining([
                testEmailConfig().cmsRateHelpEmailAddress,
            ]),
        })
    )

    expect(template).toEqual(
        expect.objectContaining({
            toAddresses: expect.not.arrayContaining([
                testEmailConfig().cmsReviewHelpEmailAddress,
            ]),
        })
    )
})
test('to addresses list does not include duplicate review email addresses', async () => {
    const sub = mockContractAndRatesFormData()
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testDuplicateEmailConfig,
        testDuplicateStateAnalystsEmails,
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template.toAddresses).toEqual(['duplicate@example.com'])
})

test('subject line is correct', async () => {
    const sub = mockContractOnlyFormData()
    const statePrograms = mockMNState().programs
    const name = packageName(
        sub.stateCode,
        sub.stateNumber,
        sub.programIDs,
        statePrograms
    )

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(
                `New Managed Care Submission: ${name}`
            ),
        })
    )
})

test('includes expected data summary for a contract only submission', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractOnlyFormData(),
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
    }
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Submission type: Contract action only'
            ),
        })
    )
    expect(template).not.toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining('Rating period:'),
        })
    )

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Contract effective dates: 01/01/2021 to 01/01/2025'
            ),
        })
    )
})

test('includes expected data summary for a contract and rates submission CMS email', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAndRatesFormData(),
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
        rateInfos: [
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                supportingDocuments: [],
                rateDateCertified: new Date('10/17/2022'),
                rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                rateCertificationName:
                    'MCR-MN-0003-MSHO-RATE-20210101-20220101-CERTIFICATION-20221017',
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('01/01/2021'),
                rateDateEnd: new Date('01/01/2022'),
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
    }
    const statePrograms = mockMNState().programs

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Submission type: Contract action and rate certification'
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Rating period: 01/01/2021 to 01/01/2022'
            ),
        })
    )

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Contract effective dates: 01/01/2021 to 01/01/2025'
            ),
        })
    )
    //Expect only have 1 rate names using regex to match name pattern specific to rate names.
    expect(
        template.bodyText?.match(
            /-RATE-[\d]{8}-[\d]{8}-(?:CERTIFICATION|AMENDMENT)-[\d]{8}/g
        )?.length
    ).toBe(1)
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[0], statePrograms)
            ),
        })
    )
})

test('includes expected data summary for a multi-rate contract and rates submission CMS email', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAndRatesFormData(),
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
        rateInfos: [
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                supportingDocuments: [],
                rateDateCertified: new Date('10/17/2022'),
                rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                rateCertificationName:
                    'MCR-MN-0003-MSHO-RATE-20210101-20220101-CERTIFICATION-20221017',
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('01/01/2021'),
                rateDateEnd: new Date('01/01/2022'),
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                supportingDocuments: [],
                rateDateCertified: new Date('10/17/2022'),
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                rateCertificationName:
                    'MCR-MN-0003-SNBC-RATE-20220201-20230201-CERTIFICATION-20221017',
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('02/01/2022'),
                rateDateEnd: new Date('02/01/2023'),
                actuaryContacts: [
                    {
                        actuarialFirm: 'STATE_IN_HOUSE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
            {
                rateType: 'AMENDMENT',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                supportingDocuments: [],
                rateDateCertified: new Date('10/17/2022'),
                rateProgramIDs: [
                    'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                    'd95394e5-44d1-45df-8151-1cc1ee66f100',
                ],
                rateCertificationName:
                    'MCR-MN-0003-MSC+-PMAP-RATE-20210605-20211231-AMENDMENT-20221017',
                rateDateStart: new Date('01/01/2022'),
                rateDateEnd: new Date('01/01/2023'),
                rateAmendmentInfo: {
                    effectiveDateStart: new Date('06/05/2021'),
                    effectiveDateEnd: new Date('12/31/2021'),
                },
                actuaryContacts: [
                    {
                        actuarialFirm: 'MERCER',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
    }
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Submission type: Contract action and rate certification'
            ),
        })
    )

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Contract effective dates: 01/01/2021 to 01/01/2025'
            ),
        })
    )
    //Expect only have 3 rate names using regex to match name pattern specific to rate names.
    expect(
        template.bodyText?.match(
            /-RATE-[\d]{8}-[\d]{8}-(?:CERTIFICATION|AMENDMENT)-[\d]{8}/g
        )?.length
    ).toBe(3)
    //First Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[0], statePrograms)
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Rating period: 01/01/2021 to 01/01/2022'
            ),
        })
    )
    //Second Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[1], statePrograms)
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Rating period: 02/01/2022 to 02/01/2023'
            ),
        })
    )
    //Third Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[2], statePrograms)
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Rate amendment effective dates: 06/05/2021 to 12/31/2021'
            ),
        })
    )
})

test('includes expected data summary for a contract amendment submission', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAmendmentFormData(),
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
        rateInfos: [
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                supportingDocuments: [],
                rateDateCertified: new Date('10/17/2022'),
                rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                rateCertificationName:
                    'MCR-MN-0003-MSHO-RATE-20210101-20220101-CERTIFICATION-20221017',
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('01/01/2021'),
                rateDateEnd: new Date('01/01/2022'),
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
    }
    const statePrograms = mockMNState().programs

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Submission type: Contract action and rate certification'
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Rating period: 01/01/2021 to 01/01/2022'
            ),
        })
    )

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Contract amendment effective dates: 01/01/2021 to 01/01/2025'
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[0], statePrograms)
            ),
        })
    )
})

test('includes expected data summary for a rate amendment submission CMS email', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAndRatesFormData(),
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
        rateInfos: [
            {
                rateType: 'AMENDMENT',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                supportingDocuments: [],
                rateDateCertified: new Date('10/17/2022'),
                rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                rateCertificationName:
                    'MCR-MN-0003-MSHO-RATE-20210605-20211231-AMENDMENT-20221017',
                rateDateStart: new Date('01/01/2021'),
                rateDateEnd: new Date('01/01/2022'),
                rateAmendmentInfo: {
                    effectiveDateStart: new Date('06/05/2021'),
                    effectiveDateEnd: new Date('12/31/2021'),
                },
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
    }
    const statePrograms = mockMNState().programs

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Submission type: Contract action and rate certification'
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Rate amendment effective dates: 06/05/2021 to 12/31/2021'
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[0], statePrograms)
            ),
        })
    )
})

test('includes link to submission', async () => {
    const sub = mockContractAmendmentFormData()
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                `http://localhost/submissions/${sub.id}`
            ),
        })
    )
})

test('includes state specific analyst on contract only submission', async () => {
    const sub = mockContractAndRatesFormData()
    const testStateAnalystEmails = testStateAnalystsEmails
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        testStateAnalystEmails,
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    const reviewerEmails = [
        ...testEmailConfig().devReviewTeamEmails,
        ...testStateAnalystEmails,
    ]
    reviewerEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('includes state specific analyst on contract and rate submission', async () => {
    const sub = mockContractAndRatesFormData()
    const testStateAnalystEmails = testStateAnalystsEmails
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        testStateAnalystEmails,
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    const reviewerEmails = [
        ...testEmailConfig().devReviewTeamEmails,
        ...testEmailConfig().oactEmails,
        ...testStateAnalystEmails,
    ]
    reviewerEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('does not include state specific analyst on contract and rate submission', async () => {
    const sub = mockContractAndRatesFormData()
    const testStateAnalystEmails = testStateAnalystsEmails
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    testStateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})

test('includes oactEmails on contract and rate submission', async () => {
    const sub = mockContractAndRatesFormData()
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    const reviewerEmails = [
        ...testEmailConfig().devReviewTeamEmails,
        ...testEmailConfig().oactEmails,
    ]
    reviewerEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('does not include oactEmails on contract only submission', async () => {
    const sub = mockContractOnlyFormData()
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    const ratesReviewerEmails = [...testEmailConfig().oactEmails]
    ratesReviewerEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})

test('CHIP contract only submission does include state specific analysts emails', async () => {
    const sub = mockContractOnlyFormData({
        stateCode: 'MS',
        programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
    })
    const statePrograms = mockMSState().programs
    const testStateAnalystEmails = testStateAnalystsEmails
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        testStateAnalystEmails,
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    testStateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('CHIP contract and rate submission does include state specific analysts emails', async () => {
    const sub = mockContractAndRatesFormData({
        stateCode: 'MS',
        programIDs: ['e0819153-5894-4153-937e-aad00ab01a8f'],
        rateInfos: [
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                supportingDocuments: [],
                rateDateStart: new Date(),
                rateDateEnd: new Date(),
                rateDateCertified: new Date(),
                rateProgramIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
                rateAmendmentInfo: undefined,
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
    })
    const statePrograms = mockMSState().programs
    const testStateAnalystEmails = testStateAnalystsEmails
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        testStateAnalystEmails,
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    testStateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('CHIP contract only submission does not include oactEmails', async () => {
    const sub = mockContractOnlyFormData({
        stateCode: 'MS',
        programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
    })
    const statePrograms = mockMSState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    const excludedEmails = [...testEmailConfig().oactEmails]

    excludedEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})

test('CHIP contract and rate submission does not include oactEmails', async () => {
    const sub = mockContractAndRatesFormData({
        stateCode: 'MS',
        programIDs: ['e0819153-5894-4153-937e-aad00ab01a8f'],
        rateInfos: [
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                supportingDocuments: [],
                rateDateStart: new Date('2021-02-02'),
                rateDateEnd: new Date('2021-11-31'),
                rateDateCertified: new Date('2020-12-01'),
                rateProgramIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
                rateAmendmentInfo: undefined,
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
    })
    const statePrograms = mockMSState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    const excludedEmails = [...testEmailConfig().oactEmails]
    excludedEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})

test('does not include rate name on contract only submission', async () => {
    const sub = mockContractOnlyFormData()
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.not.objectContaining({
            bodyText: expect.stringMatching(/Rate names:/),
        })
    )
})

test('renders overall email as expected', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAndRatesFormData(),
        contractDateStart: new Date('2021-01-01'),
        contractDateEnd: new Date('2021-12-31'),
        rateInfos: [
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                supportingDocuments: [],
                rateDateCertified: new Date('01/02/2021'),
                rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                rateCertificationName:
                    'MCR-MN-0003-MSHO-RATE-20210101-20220101-CERTIFICATION-20210102',
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('01/01/2021'),
                rateDateEnd: new Date('01/01/2022'),
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
            {
                rateType: 'NEW',
                rateDocuments: [
                    {
                        s3URL: 'bar',
                        name: 'foo',
                        documentCategories: ['RATES' as const],
                    },
                ],
                supportingDocuments: [],
                rateDateCertified: new Date('02/02/2022'),
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                rateCertificationName:
                    'MCR-MN-0003-SNBC-RATE-20220201-20230201-CERTIFICATION-20220202',
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('02/01/2022'),
                rateDateEnd: new Date('02/01/2023'),
                actuaryContacts: [
                    {
                        actuarialFirm: 'MERCER',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@example.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
    }
    const statePrograms = mockMNState().programs
    const result = await newPackageCMSEmail(
        sub,
        testEmailConfig(),
        [],
        statePrograms
    )
    if (result instanceof Error) {
        console.error(result)
        return
    }

    expect(result.bodyHTML).toMatchSnapshot()
})
