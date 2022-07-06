import {
    testEmailConfig,
    mockContractAndRatesFormData,
    testStateAnalystsEmails,
    mockContractOnlyFormData,
} from '../../testHelpers/emailerHelpers'
import { resubmitPackageCMSEmail } from './index'

describe('with rates', () => {
    const resubmitData = {
        packageName: 'MCR-VA-CCCPLUS-0002',
        updatedBy: 'bob@example.com',
        updatedAt: new Date('02/01/2022'),
        updatedReason: 'Added rate certification.',
    }
    const submission = mockContractAndRatesFormData()
    const stateAnalystEmails = testStateAnalystsEmails()
    const template = resubmitPackageCMSEmail(
        submission,
        resubmitData,
        testEmailConfig,
        stateAnalystEmails
    )
    it('contains correct subject and clearly states submission edits are completed', () => {
        expect(template).toEqual(
            expect.objectContaining({
                subject: expect.stringContaining(
                    `${resubmitData.packageName} was resubmitted`
                ),
                bodyText: expect.stringMatching(
                    `The state completed their edits on submission ${resubmitData.packageName}`
                ),
            })
        )
    })
    it('Submitted by contains correct email address', () => {
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(
                    /Submitted by: bob@example.com/
                ),
            })
        )
    })
    it('Updated on contains correct date', () => {
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(/Updated on: 02\/01\/2022/),
            })
        )
    })
    it('Changes made contains correct changes made', () => {
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(
                    /Changes made: Added rate certification./
                ),
            })
        )
    })
    it('includes link to submission', () => {
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    `http://localhost/submissions/${submission.id}`
                ),
            })
        )
    })
    it('includes rate name', () => {
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(/Rate name:/),
            })
        )
    })
    it('includes ratesReviewSharedEmails and state specific analysts emails on contract and rate resubmission email', () => {
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
        stateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })
    it('CHIP contract and rate resubmission does include state specific analysts emails', () => {
        const sub = mockContractAndRatesFormData()
        sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
        const template = resubmitPackageCMSEmail(
            sub,
            resubmitData,
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
    it('CHIP contract and rate resubmission does not include ratesReviewSharedEmails, cmsRateHelpEmailAddress or state specific analysts emails', () => {
        const sub = mockContractAndRatesFormData()
        sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
        const template = resubmitPackageCMSEmail(
            sub,
            resubmitData,
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
        stateAnalystEmails.forEach((emailAddress) => {
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
        packageName: 'MCR-VA-CCCPLUS-0003',
        updatedBy: 'bob@example.com',
        updatedAt: new Date('02/01/2022'),
        updatedReason: 'Added more contract details.',
    }
    const submission = mockContractOnlyFormData()
    const stateAnalystEmails = testStateAnalystsEmails()
    const contractOnlyTemplate = resubmitPackageCMSEmail(
        submission,
        resubmitData,
        testEmailConfig,
        stateAnalystEmails
    )

    it('does not include ratesReviewSharedEmails', () => {
        const rateReviewerEmails = [...testEmailConfig.ratesReviewSharedEmails]
        rateReviewerEmails.forEach((emailAddress) => {
            expect(contractOnlyTemplate).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
    })

    it('does include state specific analysts emails', () => {
        stateAnalystEmails.forEach((emailAddress) => {
            expect(contractOnlyTemplate).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })

    it('does not include state specific analysts emails', () => {
        const sub = mockContractOnlyFormData()
        const template = resubmitPackageCMSEmail(
            sub,
            resubmitData,
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

    it('does not include the rate name', () => {
        expect(contractOnlyTemplate).toEqual(
            expect.not.objectContaining({
                bodyText: expect.stringMatching(/Rate name:/),
            })
        )
    })

    it('CHIP contract only resubmission does state specific analysts emails', () => {
        const sub = mockContractOnlyFormData()
        sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
        const template = resubmitPackageCMSEmail(
            sub,
            resubmitData,
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

    it('CHIP contract only resubmission does not include ratesReviewSharedEmails, cmsRateHelpEmailAddress or state specific analysts emails', () => {
        const sub = mockContractOnlyFormData()
        sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
        const template = resubmitPackageCMSEmail(
            sub,
            resubmitData,
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
        stateAnalystEmails.forEach((emailAddress) => {
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
        packageName: 'MCR-VA-CCCPLUS-0003',
        updatedBy: 'bob@example.com',
        updatedAt: new Date('02/01/2022'),
        contractDateStart: new Date('2021-01-01'),
        contractDateEnd: new Date('2021-12-31'),
        rateDateStart: new Date('2021-01-01'),
        rateDateEnd: new Date('2021-12-31'),
        updatedReason: 'Added more contract details.',
    }
    const submission = mockContractOnlyFormData()
    const stateAnalystEmails = testStateAnalystsEmails()
    const template = resubmitPackageCMSEmail(
        submission,
        resubmitData,
        testEmailConfig,
        stateAnalystEmails
    )
    expect(template.bodyHTML).toMatchSnapshot()
})
