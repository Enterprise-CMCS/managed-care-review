import {
    testEmailConfig,
    testStateAnalystsEmails,
    mockUnlockedContractAndRatesFormData,
    mockUnlockedContractOnlyFormData,
    mockMNState,
    mockMSState,
} from '../../testHelpers/emailerHelpers'
import { unlockPackageCMSEmail } from './index'
import type { UnlockedHealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import {
    generateRateName,
    packageName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'

const unlockData = {
    updatedBy: 'leslie@example.com',
    updatedAt: new Date('01/01/2022'),
    updatedReason: 'Adding rate development guide.',
}
const sub: UnlockedHealthPlanFormDataType = {
    ...mockUnlockedContractAndRatesFormData(),
    contractDateStart: new Date('2021-01-01'),
    contractDateEnd: new Date('2021-12-31'),
    rateInfos: [
        {
            rateType: 'NEW',
            rateDocuments: [
                {
                    s3URL: 'bar',
                    name: 'foo',
                    sha256: 'fakesha',
                },
            ],
            supportingDocuments: [],
            rateDateStart: new Date('2021-02-02'),
            rateDateEnd: new Date('2021-11-31'),
            rateDateCertified: new Date('2020-12-01'),
            rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
            rateAmendmentInfo: undefined,
            rateCertificationName:
                'MCR-MN-0003-MSHO-RATE-20210202-20211201-CERTIFICATION-20201201',
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
const testStateAnalystEmails = testStateAnalystsEmails
const defaultStatePrograms = mockMNState().programs

describe('unlockPackageCMSEmail', () => {
    test('subject line is correct and clearly states submission is unlocked', async () => {
        const name = packageName(
            sub.stateCode,
            sub.stateNumber,
            sub.programIDs,
            defaultStatePrograms
        )
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                subject: expect.stringContaining(`${name} was unlocked`),
            })
        )
    })
    test('includes expected data summary for a contract and rates submission unlock CMS email', async () => {
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(/Unlocked by: leslie/),
            })
        )

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(/Unlocked on: 01/),
            })
        )

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(
                    /Reason for unlock: Adding rate development guide/
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
    test('includes expected data summary for a multi-rate contract and rates submission unlock CMS email', async () => {
        const sub: UnlockedHealthPlanFormDataType = {
            ...mockUnlockedContractAndRatesFormData(),
            contractDateStart: new Date('01/01/2021'),
            contractDateEnd: new Date('01/01/2025'),
            rateInfos: [
                {
                    rateType: 'NEW',
                    rateDocuments: [
                        {
                            s3URL: 'bar',
                            name: 'foo',
                            sha256: 'fakesha',
                        },
                    ],
                    supportingDocuments: [],
                    rateDateCertified: new Date('10/17/2022'),
                    rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                    rateAmendmentInfo: undefined,
                    rateDateStart: new Date('01/01/2021'),
                    rateDateEnd: new Date('01/01/2022'),
                    rateCertificationName:
                        'MCR-MN-0003-MSHO-RATE-20210101-20220101-CERTIFICATION-20221017',
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
                            sha256: 'fakesha',
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
                            actuarialFirm: 'MERCER',
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
                            sha256: 'fakesha',
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
                            actuarialFirm: 'OPTUMAS',
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
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(/Unlocked by: leslie/),
            })
        )

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(/Unlocked on: 01/),
            })
        )

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(
                    /Reason for unlock: Adding rate development guide/
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
    test('to addresses list includes DMCP and OACT emails for contract and rate package', async () => {
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        testEmailConfig().oactEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })

        testEmailConfig().dmcpSubmissionEmails.forEach((emailAddress) => {
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
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
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

    test('includes state specific analysts emails on contract and rate submission unlock', async () => {
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })
    test('includes correct toAddresses in contract and rate submission unlock', async () => {
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        const reviewerEmails = [
            ...testEmailConfig().devReviewTeamEmails,
            ...testEmailConfig().oactEmails,
        ]

        if (template instanceof Error) {
            throw template
        }

        reviewerEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })

        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([
                    ...testEmailConfig().cmsRateHelpEmailAddress,
                ]),
            })
        )
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([
                    ...testEmailConfig().cmsReviewHelpEmailAddress,
                ]),
            })
        )
    })
    test('includes state specific analysts emails on contract only submission unlock', async () => {
        const sub = mockUnlockedContractOnlyFormData()
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })
    test('does not include oactEmails on contract only submission unlock', async () => {
        const sub = mockUnlockedContractOnlyFormData()
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            [],
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
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
    test('does not include state analysts emails on contract only submission unlock when none passed in', async () => {
        const sub = mockUnlockedContractOnlyFormData()
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            [],
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
    })
    test('CHIP contract only unlock email does include state specific analysts emails', async () => {
        const sub = mockUnlockedContractOnlyFormData({
            stateCode: 'MS',
            programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
        })
        const msStatePrograms = mockMSState().programs
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            testStateAnalystEmails,
            msStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })
    test('CHIP contract only unlock email does not include oactEmails or state specific analysts emails', async () => {
        const sub = mockUnlockedContractOnlyFormData({
            stateCode: 'MS',
            programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
        })
        const msStatePrograms = mockMSState().programs
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            [],
            msStatePrograms
        )
        const excludedEmails = [...testEmailConfig().oactEmails]

        if (template instanceof Error) {
            throw template
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
    test('CHIP contract and rate unlock email does include state specific analysts emails', async () => {
        const sub = mockUnlockedContractAndRatesFormData({
            stateCode: 'MS',
            programIDs: ['e0819153-5894-4153-937e-aad00ab01a8f'],
            rateInfos: [
                {
                    rateType: 'NEW',
                    rateDocuments: [
                        {
                            s3URL: 'bar',
                            name: 'foo',
                            sha256: 'fakesha',
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
        const msStatePrograms = mockMSState().programs
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            testStateAnalystEmails,
            msStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })
    test('CHIP contract and rate unlock email does not include oactEmails or state specific analysts emails', async () => {
        const sub = mockUnlockedContractAndRatesFormData({
            stateCode: 'MS',
            programIDs: ['e0819153-5894-4153-937e-aad00ab01a8f'],
            rateInfos: [
                {
                    rateType: 'NEW',
                    rateDocuments: [
                        {
                            s3URL: 'bar',
                            name: 'foo',
                            sha256: 'fakesha',
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
        const msStatePrograms = mockMSState().programs
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            [],
            msStatePrograms
        )
        const excludedEmails = [...testEmailConfig().oactEmails]

        if (template instanceof Error) {
            throw template
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
    test('does not include rate name on contract only submission unlock', async () => {
        const sub = mockUnlockedContractOnlyFormData()
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            [],
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.not.objectContaining({
                bodyText: expect.stringMatching(/Rate names:/),
            })
        )
    })

    test('renders overall email as expected', async () => {
        const sub = mockUnlockedContractOnlyFormData()
        const template = await unlockPackageCMSEmail(
            sub,
            unlockData,
            testEmailConfig(),
            [],
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.bodyHTML).toMatchSnapshot()
    })
})
