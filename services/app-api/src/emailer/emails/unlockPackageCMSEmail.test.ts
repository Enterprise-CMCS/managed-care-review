import {
    testEmailConfig,
    testStateAnalystsEmails,
    mockUnlockedContractAndRatesFormData,
    mockUnlockedContractOnlyFormData,
} from '../../testHelpers/emailerHelpers'
import { unlockPackageCMSEmail } from './index'
import { CalendarDate } from '../../../../app-web/src/common-code/healthPlanFormDataType'

const unlockData = {
    packageName: 'MCR-VA-CCCPLUS-0001',
    updatedBy: 'leslie@example.com',
    updatedAt: new Date('01/01/2022'),
    updatedReason: 'Adding rate development guide.',
}
const submission = {
    ...mockUnlockedContractAndRatesFormData(),
    contractDateStart: '2021-01-01' as CalendarDate,
    contractDateEnd: '2021-12-31' as CalendarDate,
    rateDateStart: '2021-02-02' as CalendarDate,
    rateDateEnd: '2021-11-31' as CalendarDate,
    rateDateCertified: '2020-12-01' as CalendarDate,
}
const testStateAnalystEmails = testStateAnalystsEmails

test('subject line is correct and clearly states submission is unlocked', async () => {
    const template = await unlockPackageCMSEmail(
        submission,
        unlockData,
        testEmailConfig,
        testStateAnalystEmails
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }
    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(
                `${unlockData.packageName} was unlocked`
            ),
        })
    )
})
test('email body contains correct information', async () => {
    const template = await unlockPackageCMSEmail(
        submission,
        unlockData,
        testEmailConfig,
        testStateAnalystEmails
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
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Rate name:/),
        })
    )
})
test('includes state specific analysts emails on contract and rate submission unlock', async () => {
    const template = await unlockPackageCMSEmail(
        submission,
        unlockData,
        testEmailConfig,
        testStateAnalystEmails
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
        submission,
        unlockData,
        testEmailConfig,
        testStateAnalystEmails
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
        testStateAnalystEmails
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
        []
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
        []
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
    const sub = mockUnlockedContractOnlyFormData()
    sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        testStateAnalystEmails
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
    const sub = mockUnlockedContractOnlyFormData()
    sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        []
    )
    const excludedEmails = [
        ...testEmailConfig.ratesReviewSharedEmails,
        testEmailConfig.cmsRateHelpEmailAddress,
    ]

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
    const sub = mockUnlockedContractAndRatesFormData()
    sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        testStateAnalystEmails
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
    const sub = mockUnlockedContractAndRatesFormData()
    sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const template = await unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        []
    )
    const excludedEmails = [
        ...testEmailConfig.ratesReviewSharedEmails,
        testEmailConfig.cmsRateHelpEmailAddress,
    ]

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
        []
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
        []
    )

    if (template instanceof Error) {
        console.error(template)
        return
    }

    expect(template.bodyHTML).toMatchSnapshot()
})
