import {
    testEmailConfig,
    testStateAnalystsEmails,
    mockUnlockedContractAndRatesFormData,
    mockUnlockedContractOnlyFormData,
    mockMNState,
    mockMSState,
} from '../../testHelpers/emailerHelpers'
import { unlockPackageCMSEmail } from './index'
import {
    generateRateName,
    packageName,
    UnlockedHealthPlanFormDataType,
} from 'app-web/src/common-code/healthPlanFormDataType'

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
                    documentCategories: ['RATES' as const],
                },
            ],
            rateDateStart: new Date('2021-02-02'),
            rateDateEnd: new Date('2021-11-31'),
            rateDateCertified: new Date('2020-12-01'),
            rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
            rateAmendmentInfo: undefined,
        },
    ],
}
const testStateAnalystEmails = testStateAnalystsEmails
const defaultStatePrograms = mockMNState().programs

test('subject line is correct and clearly states submission is unlocked', async () => {
    const name = packageName(sub, defaultStatePrograms)
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        testStateAnalystEmails,
        defaultStatePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(`${name} was unlocked`),
        })
    )
})
test('email body contains correct information for single rate cert submission', async () => {
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        testStateAnalystEmails,
        defaultStatePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
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
    //Expect only have 1 rate name
    expect(template.bodyText?.match(/Rate name/g)?.length).toBe(1)
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[0], defaultStatePrograms)
            ),
        })
    )
})
test('email body contains correct information for multi-rate cert submission', async () => {
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
                        documentCategories: ['RATES' as const],
                    },
                ],
                rateDateCertified: new Date(),
                rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('01/01/2021'),
                rateDateEnd: new Date('01/01/2022'),
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
                rateDateCertified: new Date(),
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                rateAmendmentInfo: undefined,
                rateDateStart: new Date('02/01/2022'),
                rateDateEnd: new Date('02/01/2023'),
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
                rateDateCertified: new Date(),
                rateProgramIDs: [
                    'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                    'd95394e5-44d1-45df-8151-1cc1ee66f100',
                ],
                rateDateStart: new Date('01/01/2022'),
                rateDateEnd: new Date('01/01/2023'),
                rateAmendmentInfo: {
                    effectiveDateStart: new Date('06/05/2021'),
                    effectiveDateEnd: new Date('12/31/2021'),
                },
            },
        ],
    }
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        testStateAnalystEmails,
        defaultStatePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
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
    //Expect only have 3 rate names
    expect(template.bodyText?.match(/Rate name/g)?.length).toBe(3)
    //First Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[0], defaultStatePrograms)
            ),
        })
    )
    //Second Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[1], defaultStatePrograms)
            ),
        })
    )
    //Third Rate certification
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                generateRateName(sub, sub.rateInfos[2], defaultStatePrograms)
            ),
        })
    )
})
test('includes state specific analysts emails on contract and rate submission unlock', async () => {
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        testStateAnalystEmails,
        defaultStatePrograms
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
test('includes ratesReviewSharedEmails on contract and rate submission unlock', async () => {
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        testStateAnalystEmails,
        defaultStatePrograms
    )

    const reviewerEmails = [
        ...testEmailConfig.cmsReviewSharedEmails,
        ...testEmailConfig.ratesReviewSharedEmails,
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
})
test('does include state specific analysts emails on contract only submission unlock', async () => {
    const sub = mockUnlockedContractOnlyFormData()
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        testStateAnalystEmails,
        defaultStatePrograms
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
test('does not include ratesReviewSharedEmails on contract only submission unlock', async () => {
    const sub = mockUnlockedContractOnlyFormData()
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        [],
        defaultStatePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    const ratesReviewerEmails = [...testEmailConfig.ratesReviewSharedEmails]
    ratesReviewerEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})
test('does not include state specific analysts emails on contract only submission unlock', async () => {
    const sub = mockUnlockedContractOnlyFormData()
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        [],
        defaultStatePrograms
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
test('CHIP contract only unlock email does include state specific analysts emails', async () => {
    const sub = mockUnlockedContractOnlyFormData({
        stateCode: 'MS',
        programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
    })
    const msStatePrograms = mockMSState().programs
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
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
test('CHIP contract only unlock email does not include ratesReviewSharedEmails, cmsRateHelpEmailAddress or state specific analysts emails', async () => {
    const sub = mockUnlockedContractOnlyFormData({
        stateCode: 'MS',
        programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
    })
    const msStatePrograms = mockMSState().programs
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        [],
        msStatePrograms
    )
    const excludedEmails = [...testEmailConfig.ratesReviewSharedEmails]

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
                        documentCategories: ['RATES' as const],
                    },
                ],
                rateDateStart: new Date(),
                rateDateEnd: new Date(),
                rateDateCertified: new Date(),
                rateProgramIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
                rateAmendmentInfo: undefined,
            },
        ],
    })
    const msStatePrograms = mockMSState().programs
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
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
test('CHIP contract and rate unlock email does not include ratesReviewSharedEmails, cmsRateHelpEmailAddress or state specific analysts emails', async () => {
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
                        documentCategories: ['RATES' as const],
                    },
                ],
                rateDateStart: new Date(),
                rateDateEnd: new Date(),
                rateDateCertified: new Date(),
                rateProgramIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
                rateAmendmentInfo: undefined,
            },
        ],
    })
    const msStatePrograms = mockMSState().programs
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        [],
        msStatePrograms
    )
    const excludedEmails = [...testEmailConfig.ratesReviewSharedEmails]

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
test('does not include rate name on contract only submission unlock', async () => {
    const sub = mockUnlockedContractOnlyFormData()
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        [],
        defaultStatePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template).toEqual(
        expect.not.objectContaining({
            bodyText: expect.stringMatching(/Rate name:/),
        })
    )
})

test('renders overall email as expected', async () => {
    const sub = mockUnlockedContractOnlyFormData()
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        [],
        defaultStatePrograms
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template.bodyHTML).toMatchSnapshot()
})
