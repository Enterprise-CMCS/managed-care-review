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
import {
    generateRateName,
    LockedHealthPlanFormDataType,
    packageName,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { newPackageCMSEmail } from './index'
import { findPackagePrograms } from '../templateHelpers'

test('to addresses list includes review email addresses from email config', async () => {
    const sub = mockContractOnlyFormData()
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        statePrograms
    )
    testEmailConfig.cmsReviewSharedEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
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

    const packagePrograms = findPackagePrograms(sub, statePrograms)

    if (packagePrograms instanceof Error) {
        throw new Error(packagePrograms.message)
    }

    const name = packageName(sub, packagePrograms)

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        statePrograms
    )

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
        contractDateStart: '2021-01-01',
        contractDateEnd: '2025-01-01',
    }
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        statePrograms
    )

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
        contractDateStart: '2021-01-01',
        contractDateEnd: '2025-01-01',
        rateDateStart: '2021-01-01',
        rateDateEnd: '2022-01-01',
    }
    const statePrograms = mockMNState().programs
    const packagePrograms = findPackagePrograms(sub, statePrograms)

    if (packagePrograms instanceof Error) {
        throw new Error(packagePrograms.message)
    }

    const rateName = generateRateName(sub, packagePrograms)
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        statePrograms
    )

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
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(rateName),
        })
    )
})

test('includes expected data summary for a contract amendment submission', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAmendmentFormData(),
        contractDateStart: '2021-01-01',
        contractDateEnd: '2025-01-01',
        rateDateStart: '2021-01-01',
        rateDateEnd: '2022-01-01',
    }
    const statePrograms = mockMNState().programs
    const packagePrograms = findPackagePrograms(sub, statePrograms)

    if (packagePrograms instanceof Error) {
        throw new Error(packagePrograms.message)
    }

    const rateName = generateRateName(sub, packagePrograms)
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        statePrograms
    )

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
            bodyText: expect.stringContaining(rateName),
        })
    )
})

test('includes expected data summary for a rate amendment submission CMS email', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAndRatesFormData(),
        rateType: 'AMENDMENT',
        contractDateStart: '2021-01-01',
        contractDateEnd: '2025-01-01',
        rateDateStart: '2021-01-01',
        rateDateEnd: '2022-01-01',
        rateAmendmentInfo: {
            effectiveDateStart: '2021-06-05',
            effectiveDateEnd: '2021-12-31',
        },
    }
    const statePrograms = mockMNState().programs
    const packagePrograms = findPackagePrograms(sub, statePrograms)

    if (packagePrograms instanceof Error) {
        throw new Error(packagePrograms.message)
    }

    const rateName = generateRateName(sub, packagePrograms)

    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        statePrograms
    )

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
            bodyText: expect.stringContaining(rateName),
        })
    )
})

test('includes link to submission', async () => {
    const sub = mockContractAmendmentFormData()
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        statePrograms
    )
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
        testEmailConfig,
        testStateAnalystEmails,
        statePrograms
    )
    const reviewerEmails = [
        ...testEmailConfig.cmsReviewSharedEmails,
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
        testEmailConfig,
        testStateAnalystEmails,
        statePrograms
    )
    const reviewerEmails = [
        ...testEmailConfig.cmsReviewSharedEmails,
        ...testEmailConfig.ratesReviewSharedEmails,
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
        testEmailConfig,
        [],
        statePrograms
    )

    testStateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})

test('includes ratesReviewSharedEmails on contract and rate submission', async () => {
    const sub = mockContractAndRatesFormData()
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        statePrograms
    )
    const reviewerEmails = [
        ...testEmailConfig.cmsReviewSharedEmails,
        ...testEmailConfig.ratesReviewSharedEmails,
    ]
    reviewerEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('does not include ratesReviewSharedEmails on contract only submission', async () => {
    const sub = mockContractOnlyFormData()
    const statePrograms = mockMNState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        statePrograms
    )
    const ratesReviewerEmails = [...testEmailConfig.ratesReviewSharedEmails]
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
        testEmailConfig,
        testStateAnalystEmails,
        statePrograms
    )
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
        rateProgramIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
    })
    const statePrograms = mockMSState().programs
    const testStateAnalystEmails = testStateAnalystsEmails
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        testStateAnalystEmails,
        statePrograms
    )
    testStateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('CHIP contract only submission does not include ratesReviewSharedEmails and cmsRateHelpEmailAddress', async () => {
    const sub = mockContractOnlyFormData({
        stateCode: 'MS',
        programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
    })
    const statePrograms = mockMSState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        statePrograms
    )
    const excludedEmails = [...testEmailConfig.ratesReviewSharedEmails]

    excludedEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})

test('CHIP contract and rate submission does not include ratesReviewSharedEmails and cmsRateHelpEmailAddress', async () => {
    const sub = mockContractAndRatesFormData({
        stateCode: 'MS',
        programIDs: ['e0819153-5894-4153-937e-aad00ab01a8f'],
        rateProgramIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
    })
    const statePrograms = mockMSState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        statePrograms
    )
    const excludedEmails = [
        ...testEmailConfig.ratesReviewSharedEmails,
        testEmailConfig.cmsRateHelpEmailAddress,
    ]
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
    const statePrograms = mockMSState().programs
    const template = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        statePrograms
    )
    expect(template).toEqual(
        expect.not.objectContaining({
            bodyText: expect.stringMatching(/Rate name:/),
        })
    )
})

test('renders overall email as expected', async () => {
    const sub: LockedHealthPlanFormDataType = {
        ...mockContractAndRatesFormData(),
        contractDateStart: '2021-01-01',
        contractDateEnd: '2021-12-31',
        rateDateStart: '2021-02-02',
        rateDateEnd: '2021-11-31',
        rateDateCertified: '2020-12-01',
    }
    const statePrograms = mockMNState().programs
    const result = await newPackageCMSEmail(
        sub,
        testEmailConfig,
        [],
        statePrograms
    )
    if (result instanceof Error) {
        console.error(result)
        return
    }

    expect(result.bodyHTML).toMatchSnapshot()
})
