import {
    testEmailConfig,
    mockContractAndRatesFormData,
    testStateAnalystsEmails,
    mockContractOnlyFormData,
    mockMNState,
    mockMSState,
} from '../../testHelpers/emailerHelpers'
import { resubmitPackageCMSEmail } from './index'
import {
    generateRateName,
    LockedHealthPlanFormDataType,
    packageName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'

describe('with rates', () => {
    const resubmitData = {
        updatedBy: 'bob@example.com',
        updatedAt: new Date('02/01/2022'),
        updatedReason: 'Added rate certification.',
    }
    const submission = mockContractAndRatesFormData()
    const testStateAnalystEmails = testStateAnalystsEmails
    const defaultStatePrograms = mockMNState().programs

    it('contains correct subject and clearly states submission edits are completed', async () => {
        const name = packageName(submission, defaultStatePrograms)
        const template = await resubmitPackageCMSEmail(
            submission,
            resubmitData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            console.error(template)
            return
        }

        expect(template).toEqual(
            expect.objectContaining({
                subject: expect.stringContaining(`${name} was resubmitted`),
                bodyText: expect.stringMatching(
                    `The state completed their edits on submission ${name}`
                ),
            })
        )
    })
    it('includes expected data summary for a contract and rates resubmission CMS email', async () => {
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
            ],
        }
        const template = await resubmitPackageCMSEmail(
            sub,
            resubmitData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            console.error(template)
            return
        }

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(
                    /Submitted by: bob@example.com/
                ),
            })
        )
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(/Updated on: 02\/01\/2022/),
            })
        )
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(
                    /Changes made: Added rate certification./
                ),
            })
        )
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    `http://localhost/submissions/${submission.id}`
                ),
            })
        )
        expect(template).toEqual(
            expect.objectContaining({
                bodyHTML: expect.stringContaining(
                    `href="http://localhost/submissions/${submission.id}"`
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
                    generateRateName(
                        sub,
                        sub.rateInfos[0],
                        defaultStatePrograms
                    )
                ),
            })
        )
    })
    it('includes expected data summary for a multi-rate contract and rates resubmission CMS email', async () => {
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
                    rateType: 'AMENDMENT',
                    rateDocuments: [
                        {
                            s3URL: 'bar',
                            name: 'foo',
                            documentCategories: ['RATES' as const],
                        },
                    ],
                    supportingDocuments: [],
                    rateDateCertified: new Date('01/02/2021'),
                    rateProgramIDs: [
                        'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                        'd95394e5-44d1-45df-8151-1cc1ee66f100',
                    ],
                    rateCertificationName:
                        'MCR-MN-0003-MSC+-PMAP-RATE-20210605-20211231-AMENDMENT-20210102',
                    rateDateStart: new Date('01/01/2022'),
                    rateDateEnd: new Date('01/01/2023'),
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
        const template = await resubmitPackageCMSEmail(
            sub,
            resubmitData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            console.error(template)
            return
        }

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
                    generateRateName(
                        sub,
                        sub.rateInfos[0],
                        defaultStatePrograms
                    )
                ),
            })
        )
        //Second Rate certification
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    generateRateName(
                        sub,
                        sub.rateInfos[1],
                        defaultStatePrograms
                    )
                ),
            })
        )
        //Third Rate certification
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    generateRateName(
                        sub,
                        sub.rateInfos[2],
                        defaultStatePrograms
                    )
                ),
            })
        )
    })
    test('to addresses list includes DMCP and OACT group emails for contract and rate package', async () => {
        const template = await resubmitPackageCMSEmail(
            submission,
            resubmitData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            console.error(template)
            return
        }

        testEmailConfig().dmcpEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })

        testEmailConfig().oactEmails.forEach((emailAddress) => {
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

    test('to addresses list does not include help addresses', async () => {
        const template = await resubmitPackageCMSEmail(
            submission,
            resubmitData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
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

    it('includes state specific analysts emails on contract and rate resubmission email', async () => {
        const template = await resubmitPackageCMSEmail(
            submission,
            resubmitData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )
        const reviewerEmails = [
            ...testEmailConfig().devReviewTeamEmails,
            ...testEmailConfig().oactEmails,
        ]

        if (template instanceof Error) {
            console.error(template)
            return
        }

        reviewerEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })
    it('CHIP contract and rate resubmission does include state specific analysts emails', async () => {
        const sub = mockContractAndRatesFormData({
            stateCode: 'MS',
            programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
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
                    rateProgramIDs: ['e0819153-5894-4153-937e-aad00ab01a8f'],
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
        })
        const msStatePrograms = mockMSState().programs
        const template = await resubmitPackageCMSEmail(
            sub,
            resubmitData,
            testEmailConfig(),
            testStateAnalystEmails,
            msStatePrograms
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
    it('CHIP contract and rate resubmission does not include oactEmails or state specific analysts emails', async () => {
        const sub = mockContractAndRatesFormData({
            stateCode: 'MS',
            programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
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
                    rateProgramIDs: ['e0819153-5894-4153-937e-aad00ab01a8f'],
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
        })
        const msStatePrograms = mockMSState().programs
        const template = await resubmitPackageCMSEmail(
            sub,
            resubmitData,
            testEmailConfig(),
            [],
            msStatePrograms
        )
        const excludedEmails = [...testEmailConfig().oactEmails]

        if (template instanceof Error) {
            console.error(template)
            return
        }

        excludedEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
    })
})

describe('contract only', () => {
    const resubmitData = {
        updatedBy: 'bob@example.com',
        updatedAt: new Date('02/01/2022'),
        updatedReason: 'Added more contract details.',
    }
    const submission = mockContractOnlyFormData()
    const testStateAnalystEmails = testStateAnalystsEmails
    const defaultStatePrograms = mockMNState().programs

    it('does not include oactEmails', async () => {
        const contractOnlyTemplate = await resubmitPackageCMSEmail(
            submission,
            resubmitData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )
        const rateReviewerEmails = [...testEmailConfig().oactEmails]

        if (contractOnlyTemplate instanceof Error) {
            console.error(contractOnlyTemplate)
            return
        }

        rateReviewerEmails.forEach((emailAddress) => {
            expect(contractOnlyTemplate).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
    })

    it('does include state specific analysts emails', async () => {
        const contractOnlyTemplate = await resubmitPackageCMSEmail(
            submission,
            resubmitData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (contractOnlyTemplate instanceof Error) {
            console.error(contractOnlyTemplate)
            return
        }

        testStateAnalystEmails.forEach((emailAddress) => {
            expect(contractOnlyTemplate).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })

    it('does not include the rate name', async () => {
        const contractOnlyTemplate = await resubmitPackageCMSEmail(
            submission,
            resubmitData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (contractOnlyTemplate instanceof Error) {
            console.error(contractOnlyTemplate)
            return
        }

        expect(contractOnlyTemplate).toEqual(
            expect.not.objectContaining({
                bodyText: expect.stringMatching(/Rate names:/),
            })
        )
    })

    it('does not include state specific analysts emails', async () => {
        const template = await resubmitPackageCMSEmail(
            mockContractOnlyFormData(),
            resubmitData,
            testEmailConfig(),
            [],
            defaultStatePrograms
        )

        if (template instanceof Error) {
            console.error(testStateAnalystEmails)
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

    it('CHIP contract only resubmission does state specific analysts emails', async () => {
        const sub = mockContractOnlyFormData({
            stateCode: 'MS',
            programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
        })
        const msStatePrograms = mockMSState().programs
        const template = await resubmitPackageCMSEmail(
            sub,
            resubmitData,
            testEmailConfig(),
            testStateAnalystEmails,
            msStatePrograms
        )

        if (template instanceof Error) {
            console.error(testStateAnalystEmails)
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

    it('CHIP contract only resubmission does not include oactEmails or state specific analysts emails', async () => {
        const sub = mockContractOnlyFormData({
            stateCode: 'MS',
            programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
        })
        const msStatePrograms = mockMSState().programs

        const template = await resubmitPackageCMSEmail(
            sub,
            resubmitData,
            testEmailConfig(),
            [],
            msStatePrograms
        )
        const excludedEmails = [...testEmailConfig().oactEmails]

        if (template instanceof Error) {
            console.error(testStateAnalystEmails)
            return
        }

        excludedEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
    })
})

test('renders overall email as expected', async () => {
    const resubmitData = {
        updatedBy: 'bob@example.com',
        updatedAt: new Date('02/01/2022'),
        updatedReason: 'Added more contract details.',
    }
    const submission: LockedHealthPlanFormDataType = {
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
    const defaultStatePrograms = mockMNState().programs

    const testStateAnalystEmails = testStateAnalystsEmails
    const template = await resubmitPackageCMSEmail(
        submission,
        resubmitData,
        testEmailConfig(),
        testStateAnalystEmails,
        defaultStatePrograms
    )
    if (template instanceof Error) {
        console.error(testStateAnalystEmails)
        return
    }

    expect(template.bodyHTML).toMatchSnapshot()
})
