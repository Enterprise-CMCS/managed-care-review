import {
    testEmailConfig,
    testStateAnalystsEmails,
    mockContractAmendmentFormData,
    mockContractOnlyFormData,
    mockContractAndRatesFormData,
} from '../../testHelpers/emailerHelpers'
import { LockedHealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { newPackageCMSEmail } from './index'
import { formatRateNameDate } from '../../../../app-web/src/common-code/dateHelpers'

test('to addresses list includes review email addresses from email config', async () => {
    const sub = mockContractOnlyFormData()
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        []
    )
    testEmailConfig.cmsReviewSharedEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('subject line is correct', async () => {
    const sub = mockContractOnlyFormData()
    const name = 'FL-MMA-001'
    const template = await newPackageCMSEmail(sub, name, testEmailConfig, [])

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
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        []
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
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
        rateDateStart: new Date('01/01/2021'),
        rateDateEnd: new Date('01/01/2022'),
    }
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        []
    )
    const rateName = `some-title-RATE-20210101-20220101-CERTIFICATION-${formatRateNameDate(
        new Date()
    )}`

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
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
        rateDateStart: new Date('01/01/2021'),
        rateDateEnd: new Date('01/01/2022'),
    }
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        []
    )
    const rateName = `some-title-RATE-20210101-20220101-CERTIFICATION-${formatRateNameDate(
        new Date()
    )}`

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
        contractDateStart: new Date('01/01/2021'),
        contractDateEnd: new Date('01/01/2025'),
        rateDateStart: new Date('01/01/2021'),
        rateDateEnd: new Date('01/01/2022'),
        rateAmendmentInfo: {
            effectiveDateStart: new Date('06/05/2021'),
            effectiveDateEnd: new Date('12/31/2021'),
        },
    }
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        []
    )
    const rateName = `some-title-RATE-20210605-20211231-AMENDMENT-${formatRateNameDate(
        new Date()
    )}`

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
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        []
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
    const stateAnalystEmails = testStateAnalystsEmails()
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        stateAnalystEmails
    )
    const reviewerEmails = [
        ...testEmailConfig.cmsReviewSharedEmails,
        ...stateAnalystEmails,
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
    const stateAnalystEmails = testStateAnalystsEmails()
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        stateAnalystEmails
    )
    const reviewerEmails = [
        ...testEmailConfig.cmsReviewSharedEmails,
        ...testEmailConfig.ratesReviewSharedEmails,
        ...stateAnalystEmails,
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
    const stateAnalystEmails = testStateAnalystsEmails()
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        []
    )

    stateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})

test('includes ratesReviewSharedEmails on contract and rate submission', async () => {
    const sub = mockContractAndRatesFormData()
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        []
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
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        []
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
    const sub = mockContractOnlyFormData()
    sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const stateAnalystEmails = testStateAnalystsEmails()
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        stateAnalystEmails
    )
    stateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('CHIP contract and rate submission does include state specific analysts emails', async () => {
    const sub = mockContractAndRatesFormData()
    sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const stateAnalystEmails = testStateAnalystsEmails()
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        stateAnalystEmails
    )
    stateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})

test('CHIP contract only submission does not include ratesReviewSharedEmails and cmsRateHelpEmailAddress', async () => {
    const sub = mockContractOnlyFormData()
    sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        []
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

test('CHIP contract and rate submission does not include ratesReviewSharedEmails and cmsRateHelpEmailAddress', async () => {
    const sub = mockContractAndRatesFormData()
    sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        []
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
    const template = await newPackageCMSEmail(
        sub,
        'some-title',
        testEmailConfig,
        []
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
        contractDateStart: new Date('2021-01-01'),
        contractDateEnd: new Date('2021-12-31'),
        rateDateStart: new Date('2021-01-01'),
        rateDateEnd: new Date('2021-12-31'),
        rateDateCertified: new Date('2020-12-01'),
    }
    const template = await newPackageCMSEmail(
        sub,
        'CMS-new-submission-snapshot',
        testEmailConfig,
        []
    )
    expect(template.bodyHTML).toMatchSnapshot()
})
