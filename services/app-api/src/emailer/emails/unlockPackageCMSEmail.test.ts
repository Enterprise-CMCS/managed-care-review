import {
    testEmailConfig,
    testStateAnalystsEmails,
    mockUnlockedContractAndRatesFormData,
    mockUnlockedContractOnlyFormData,
} from '../../testHelpers/emailerHelpers'
import { unlockPackageCMSEmail } from './index'

const unlockData = {
    packageName: 'MCR-VA-CCCPLUS-0001',
    updatedBy: 'leslie@example.com',
    updatedAt: new Date('01/01/2022'),
    updatedReason: 'Adding rate development guide.',
}
const submission = mockUnlockedContractAndRatesFormData()
const rateName = 'test-rate-name'
const stateAnalystEmails = testStateAnalystsEmails()
const template = unlockPackageCMSEmail(
    submission,
    unlockData,
    testEmailConfig,
    rateName,
    stateAnalystEmails
)

test('subject line is correct and clearly states submission is unlocked', () => {
    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(
                `${unlockData.packageName} was unlocked`
            ),
        })
    )
})
test('unlocked by includes correct email address', () => {
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Unlocked by: leslie/),
        })
    )
})
test('unlocked on includes correct date', () => {
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Unlocked on: 01/),
        })
    )
})
test('includes correct reason', () => {
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(
                /Reason for unlock: Adding rate development guide/
            ),
        })
    )
})
test('includes rate name', () => {
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/Rate name:/),
        })
    )
})
test('includes state specific analysts emails on contract and rate submission unlock', () => {
    stateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})
test('includes ratesReviewSharedEmails on contract and rate submission unlock', () => {
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
test('does include state specific analysts emails on contract only submission unlock', () => {
    const sub = mockUnlockedContractOnlyFormData()
    const rateName = 'test-rate-name'
    const contractOnlyTemplate = unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        rateName,
        stateAnalystEmails
    )
    stateAnalystEmails.forEach((emailAddress) => {
        expect(contractOnlyTemplate).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([emailAddress]),
            })
        )
    })
})
test('does not include ratesReviewSharedEmails on contract only submission unlock', () => {
    const sub = mockUnlockedContractOnlyFormData()
    const rateName = 'test-rate-name'
    const contractOnlyTemplate = unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        rateName,
        []
    )
    const ratesReviewerEmails = [...testEmailConfig.ratesReviewSharedEmails]
    ratesReviewerEmails.forEach((emailAddress) => {
        expect(contractOnlyTemplate).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})
test('does not include state specific analysts emails on contract only submission unlock', () => {
    const sub = mockUnlockedContractOnlyFormData()
    const rateName = 'test-rate-name'
    const contractOnlyTemplate = unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        rateName,
        []
    )
    stateAnalystEmails.forEach((emailAddress) => {
        expect(contractOnlyTemplate).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})
test('CHIP contract only unlock email does include state specific analysts emails', () => {
    const sub = mockUnlockedContractOnlyFormData()
    sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const template = unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        rateName,
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
test('CHIP contract only unlock email does not include ratesReviewSharedEmails, cmsRateHelpEmailAddress or state specific analysts emails', () => {
    const sub = mockUnlockedContractOnlyFormData()
    sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const template = unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        rateName,
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
    stateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})
test('CHIP contract and rate unlock email does include state specific analysts emails', () => {
    const sub = mockUnlockedContractAndRatesFormData()
    sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const template = unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        rateName,
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
test('CHIP contract and rate unlock email does not include ratesReviewSharedEmails, cmsRateHelpEmailAddress or state specific analysts emails', () => {
    const sub = mockUnlockedContractAndRatesFormData()
    sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
    const template = unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        rateName,
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
    stateAnalystEmails.forEach((emailAddress) => {
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([emailAddress]),
            })
        )
    })
})
test('does not include rate name on contract only submission unlock', () => {
    const sub = mockUnlockedContractOnlyFormData()
    const rateName = 'test-rate-name'
    const contractOnlyTemplate = unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        rateName,
        []
    )
    expect(contractOnlyTemplate).toEqual(
        expect.not.objectContaining({
            bodyText: expect.stringMatching(/Rate name:/),
        })
    )
})

test('renders overall email as expected', async () => {
    const sub = mockUnlockedContractOnlyFormData()
    const rateName = 'test-rate-name'
    const template = unlockPackageCMSEmail(
        sub,
        unlockData,
        testEmailConfig,
        rateName,
        []
    )
    expect(template.bodyHTML).toMatchSnapshot()
})
