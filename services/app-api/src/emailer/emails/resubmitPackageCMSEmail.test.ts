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
    const testStateAnalystEmails = testStateAnalystsEmails

    it('contains correct subject and clearly states submission edits are completed', async () => {
        const template = await resubmitPackageCMSEmail(
            submission,
            resubmitData,
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
                    `${resubmitData.packageName} was resubmitted`
                ),
                bodyText: expect.stringMatching(
                    `The state completed their edits on submission ${resubmitData.packageName}`
                ),
            })
        )
    })
    it('contains correct information in body of email', async () => {
        const template = await resubmitPackageCMSEmail(
            submission,
            resubmitData,
            testEmailConfig,
            testStateAnalystEmails
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
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(/Rate name:/),
            })
        )
    })
    it('includes ratesReviewSharedEmails and state specific analysts emails on contract and rate resubmission email', async () => {
        const template = await resubmitPackageCMSEmail(
            submission,
            resubmitData,
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
        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })
    it('CHIP contract and rate resubmission does include state specific analysts emails', async () => {
        const sub = mockContractAndRatesFormData()
        sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
        const template = await resubmitPackageCMSEmail(
            sub,
            resubmitData,
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
    it('CHIP contract and rate resubmission does not include ratesReviewSharedEmails, cmsRateHelpEmailAddress or state specific analysts emails', async () => {
        const sub = mockContractAndRatesFormData()
        sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
        const template = await resubmitPackageCMSEmail(
            sub,
            resubmitData,
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
})

describe('contract only', () => {
    const resubmitData = {
        packageName: 'MCR-VA-CCCPLUS-0003',
        updatedBy: 'bob@example.com',
        updatedAt: new Date('02/01/2022'),
        updatedReason: 'Added more contract details.',
    }
    const submission = mockContractOnlyFormData()
    const testStateAnalystEmails = testStateAnalystsEmails

    it('does not include ratesReviewSharedEmails', async () => {
        const contractOnlyTemplate = await resubmitPackageCMSEmail(
            submission,
            resubmitData,
            testEmailConfig,
            testStateAnalystEmails
        )
        const rateReviewerEmails = [...testEmailConfig.ratesReviewSharedEmails]

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
            testEmailConfig,
            testStateAnalystEmails
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
            testEmailConfig,
            testStateAnalystEmails
        )

        if (contractOnlyTemplate instanceof Error) {
            console.error(contractOnlyTemplate)
            return
        }

        expect(contractOnlyTemplate).toEqual(
            expect.not.objectContaining({
                bodyText: expect.stringMatching(/Rate name:/),
            })
        )
    })

    it('does not include state specific analysts emails', async () => {
        const template = await resubmitPackageCMSEmail(
            mockContractOnlyFormData(),
            resubmitData,
            testEmailConfig,
            []
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
        const sub = mockContractOnlyFormData()
        sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
        const template = await resubmitPackageCMSEmail(
            sub,
            resubmitData,
            testEmailConfig,
            testStateAnalystEmails
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

    it('CHIP contract only resubmission does not include ratesReviewSharedEmails, cmsRateHelpEmailAddress or state specific analysts emails', async () => {
        const sub = mockContractOnlyFormData()
        sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
        const template = await resubmitPackageCMSEmail(
            sub,
            resubmitData,
            testEmailConfig,
            []
        )
        const excludedEmails = [
            ...testEmailConfig.ratesReviewSharedEmails,
            testEmailConfig.cmsRateHelpEmailAddress,
        ]

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
        packageName: 'MCR-VA-CCCPLUS-0003',
        updatedBy: 'bob@example.com',
        updatedAt: new Date('02/01/2022'),
        updatedReason: 'Added more contract details.',
    }
    const submission = {
        ...mockContractOnlyFormData(),
        contractDateStart: new Date('2021-01-01'),
        contractDateEnd: new Date('2021-12-31'),
        rateDateStart: new Date('2021-02-02'),
        rateDateEnd: new Date('2021-11-31'),
        rateDateCertified: new Date('2020-12-01'),
    }
    const testStateAnalystEmails = testStateAnalystsEmails
    const template = await resubmitPackageCMSEmail(
        submission,
        resubmitData,
        testEmailConfig,
        testStateAnalystEmails,
        'MCR-VA-CCCPLUS-0002-RATE-20210202-20211201-CERTIFICATION-20201201'
    )
    if (template instanceof Error) {
        console.error(testStateAnalystEmails)
        return
    }
    expect(template.bodyHTML).toMatchSnapshot()
})
