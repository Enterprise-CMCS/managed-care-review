import {
    testEmailConfig,
    testStateAnalystsEmails,
    mockContractAmendmentFormData,
    mockContractOnlyFormData,
    mockContractAndRatesFormData,
    mockUser,
    mockUnlockedContractAndRatesFormData,
    mockUnlockedContractOnlyFormData,
} from '../testHelpers/emailerHelpers'
import { LockedHealthPlanFormDataType } from '../../../app-web/src/common-code/healthPlanFormDataType'
import {
    newPackageCMSEmail,
    newPackageStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmittedCMSEmail,
    resubmittedStateEmail,
} from './'
import { formatRateNameDate } from '../../../app-web/src/common-code/dateHelpers'
import { unlockedWithFullContracts } from '../../../app-web/src/common-code/healthPlanFormDataMocks'

describe('Email templates', () => {
    describe('CMS email', () => {
        it('to addresses list includes review email addresses from email config', () => {
            const sub = mockContractOnlyFormData()
            const template = newPackageCMSEmail(
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
        it('subject line is correct', () => {
            const sub = mockContractOnlyFormData()
            const name = 'FL-MMA-001'
            const template = newPackageCMSEmail(sub, name, testEmailConfig, [])

            expect(template).toEqual(
                expect.objectContaining({
                    subject: expect.stringContaining(
                        `New Managed Care Submission: ${name}`
                    ),
                })
            )
        })
        it('includes expected data summary for a contract only submission', () => {
            const sub: LockedHealthPlanFormDataType = {
                ...mockContractOnlyFormData(),
                contractDateStart: new Date('01/01/2021'),
                contractDateEnd: new Date('01/01/2025'),
            }
            const template = newPackageCMSEmail(
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
        it('includes expected data summary for a contract and rates submission CMS email', () => {
            const sub: LockedHealthPlanFormDataType = {
                ...mockContractAndRatesFormData(),
                contractDateStart: new Date('01/01/2021'),
                contractDateEnd: new Date('01/01/2025'),
                rateDateStart: new Date('01/01/2021'),
                rateDateEnd: new Date('01/01/2022'),
            }
            const template = newPackageCMSEmail(
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
        it('includes expected data summary for a contract amendment submission', () => {
            const sub: LockedHealthPlanFormDataType = {
                ...mockContractAmendmentFormData(),
                contractDateStart: new Date('01/01/2021'),
                contractDateEnd: new Date('01/01/2025'),
                rateDateStart: new Date('01/01/2021'),
                rateDateEnd: new Date('01/01/2022'),
            }
            const template = newPackageCMSEmail(
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
        it.only('includes expected data summary for a rate amendment submission CMS email', () => {
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
            const template = newPackageCMSEmail(
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
        it('includes link to submission', () => {
            const sub = mockContractAmendmentFormData()
            const template = newPackageCMSEmail(
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
        it('includes state specific analyst on contract only submission', () => {
            const sub = mockContractAndRatesFormData()
            const stateAnalystEmails = testStateAnalystsEmails()
            const template = newPackageCMSEmail(
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
        it('includes state specific analyst on contract and rate submission', () => {
            const sub = mockContractAndRatesFormData()
            const stateAnalystEmails = testStateAnalystsEmails()
            const template = newPackageCMSEmail(
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
        it('does not include state specific analyst on contract and rate submission', () => {
            const sub = mockContractAndRatesFormData()
            const stateAnalystEmails = testStateAnalystsEmails()
            const template = newPackageCMSEmail(
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
        it('includes ratesReviewSharedEmails on contract and rate submission', () => {
            const sub = mockContractAndRatesFormData()
            const template = newPackageCMSEmail(
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
        it('does not include ratesReviewSharedEmails on contract only submission', () => {
            const sub = mockContractOnlyFormData()
            const template = newPackageCMSEmail(
                sub,
                'some-title',
                testEmailConfig,
                []
            )
            const ratesReviewerEmails = [
                ...testEmailConfig.ratesReviewSharedEmails,
            ]
            ratesReviewerEmails.forEach((emailAddress) => {
                expect(template).toEqual(
                    expect.objectContaining({
                        toAddresses: expect.not.arrayContaining([emailAddress]),
                    })
                )
            })
        })
        it('CHIP contract only submission does include state specific analysts emails', () => {
            const sub = mockContractOnlyFormData()
            sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
            const stateAnalystEmails = testStateAnalystsEmails()
            const template = newPackageCMSEmail(
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
        it('CHIP contract and rate submission does include state specific analysts emails', () => {
            const sub = mockContractAndRatesFormData()
            sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
            const stateAnalystEmails = testStateAnalystsEmails()
            const template = newPackageCMSEmail(
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
        it('CHIP contract only submission does not include ratesReviewSharedEmails and cmsRateHelpEmailAddress', () => {
            const sub = mockContractOnlyFormData()
            sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
            const template = newPackageCMSEmail(
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
        it('CHIP contract and rate submission does not include ratesReviewSharedEmails and cmsRateHelpEmailAddress', () => {
            const sub = mockContractAndRatesFormData()
            sub.programIDs = ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a']
            const template = newPackageCMSEmail(
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
        it('does not include rate name on contract only submission', () => {
            const sub = mockContractOnlyFormData()
            const template = newPackageCMSEmail(
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
    })
    describe('State email', () => {
        it('to addresses list includes current user', () => {
            const sub = mockContractOnlyFormData()
            const user = mockUser()
            const template = newPackageStateEmail(
                sub,
                'some-title',
                user,
                testEmailConfig
            )
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([user.email]),
                })
            )
        })

        it('to addresses list includes all state contacts on submission', () => {
            const sub: LockedHealthPlanFormDataType = {
                ...mockContractOnlyFormData(),
                stateContacts: [
                    {
                        name: 'test1',
                        titleRole: 'Foo1',
                        email: 'test1@example.com',
                    },
                    {
                        name: 'test2',
                        titleRole: 'Foo2',
                        email: 'test2@example.com',
                    },
                ],
            }
            const user = mockUser()
            const template = newPackageStateEmail(
                sub,
                'some-title',
                user,
                testEmailConfig
            )
            sub.stateContacts.forEach((contact) => {
                expect(template).toEqual(
                    expect.objectContaining({
                        toAddresses: expect.arrayContaining([contact.email]),
                    })
                )
            })
        })

        it('subject line is correct and clearly states submission is complete', () => {
            const sub = mockContractOnlyFormData()
            const name = 'FL-MMA-001'
            const user = mockUser()
            const template = newPackageStateEmail(
                sub,
                name,
                user,
                testEmailConfig
            )

            expect(template).toEqual(
                expect.objectContaining({
                    subject: expect.stringContaining(`${name} was sent to CMS`),
                    bodyText: expect.stringContaining(
                        `${name} was successfully submitted.`
                    ),
                })
            )
        })

        it('includes mcog, rate, and team email addresses', () => {
            const sub = mockContractOnlyFormData()
            const name = 'FL-MMA-001'
            const user = mockUser()
            const template = newPackageStateEmail(
                sub,
                name,
                user,
                testEmailConfig
            )

            expect(template).toEqual(
                expect.objectContaining({
                    subject: expect.stringContaining(`${name} was sent to CMS`),
                    bodyText: expect.stringContaining(
                        `please reach out to mcog@example.com`
                    ),
                })
            )
            expect(template).toEqual(
                expect.objectContaining({
                    subject: expect.stringContaining(`${name} was sent to CMS`),
                    bodyText: expect.stringContaining(
                        `please reach out to rates@example.com`
                    ),
                })
            )
            expect(template).toEqual(
                expect.objectContaining({
                    subject: expect.stringContaining(`${name} was sent to CMS`),
                    bodyText: expect.stringContaining(
                        `please reach out to mc-review@example.com`
                    ),
                })
            )
        })

        it('includes link to submission', () => {
            const sub = mockContractAmendmentFormData()
            const user = mockUser()
            const template = newPackageStateEmail(
                sub,
                'some-title',
                user,
                testEmailConfig
            )
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringContaining(
                        `http://localhost/submissions/${sub.id}`
                    ),
                })
            )
        })

        it('includes information about what is next', () => {
            const sub = mockContractAmendmentFormData()
            const user = mockUser()
            const template = newPackageStateEmail(
                sub,
                'some-title',
                user,
                testEmailConfig
            )
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringContaining('What comes next:'),
                })
            )
        })

        it('includes expected data summary for a contract and rates submission State email', () => {
            const sub: LockedHealthPlanFormDataType = {
                ...mockContractAndRatesFormData(),
                contractDateStart: new Date('01/01/2021'),
                contractDateEnd: new Date('01/01/2025'),
                rateDateStart: new Date('01/01/2021'),
                rateDateEnd: new Date('01/01/2022'),
            }
            const user = mockUser()
            const template = newPackageStateEmail(
                sub,
                'some-title',
                user,
                testEmailConfig
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

        it('includes expected data summary for a rate amendment submission State email', () => {
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
            const user = mockUser()
            const template = newPackageStateEmail(
                sub,
                'some-title',
                user,
                testEmailConfig
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
    })
    describe('CMS unlock email', () => {
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
        it('subject line is correct and clearly states submission is unlocked', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    subject: expect.stringContaining(
                        `${unlockData.packageName} was unlocked`
                    ),
                })
            )
        })
        it('unlocked by includes correct email address', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(/Unlocked by: leslie/),
                })
            )
        })
        it('unlocked on includes correct date', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(/Unlocked on: 01/),
                })
            )
        })
        it('includes correct reason', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /Reason for unlock: Adding rate development guide/
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
        it('includes state specific analysts emails on contract and rate submission unlock', () => {
            stateAnalystEmails.forEach((emailAddress) => {
                expect(template).toEqual(
                    expect.objectContaining({
                        toAddresses: expect.arrayContaining([emailAddress]),
                    })
                )
            })
        })
        it('includes ratesReviewSharedEmails on contract and rate submission unlock', () => {
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
        it('does include state specific analysts emails on contract only submission unlock', () => {
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
        it('does not include ratesReviewSharedEmails on contract only submission unlock', () => {
            const sub = mockUnlockedContractOnlyFormData()
            const rateName = 'test-rate-name'
            const contractOnlyTemplate = unlockPackageCMSEmail(
                sub,
                unlockData,
                testEmailConfig,
                rateName,
                []
            )
            const ratesReviewerEmails = [
                ...testEmailConfig.ratesReviewSharedEmails,
            ]
            ratesReviewerEmails.forEach((emailAddress) => {
                expect(contractOnlyTemplate).toEqual(
                    expect.objectContaining({
                        toAddresses: expect.not.arrayContaining([emailAddress]),
                    })
                )
            })
        })
        it('does not include state specific analysts emails on contract only submission unlock', () => {
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
        it('CHIP contract only unlock email does include state specific analysts emails', () => {
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
        it('CHIP contract only unlock email does not include ratesReviewSharedEmails, cmsRateHelpEmailAddress or state specific analysts emails', () => {
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
        it('CHIP contract and rate unlock email does include state specific analysts emails', () => {
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
        it('CHIP contract and rate unlock email does not include ratesReviewSharedEmails, cmsRateHelpEmailAddress or state specific analysts emails', () => {
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
        it('does not include rate name on contract only submission unlock', () => {
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
    })
    describe('State unlock email', () => {
        const unlockData = {
            packageName: 'MCR-VA-CCCPLUS-0002',
            updatedBy: 'josh@example.com',
            updatedAt: new Date('02/01/2022'),
            updatedReason: 'Adding rate certification.',
        }
        const submissionName = 'MN-PMAP-0001'
        const sub = unlockedWithFullContracts()
        const template = unlockPackageStateEmail(
            sub,
            unlockData,
            testEmailConfig,
            submissionName
        )
        it('subject line is correct and clearly states submission is unlocked', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    subject: expect.stringContaining(
                        `${unlockData.packageName} was unlocked by CMS`
                    ),
                })
            )
        })
        it('unlocked by includes correct email address', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(/Unlocked by: josh/),
                })
            )
        })
        it('unlocked on includes correct date', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(/Unlocked on: 02/),
                })
            )
        })
        it('includes correct reason', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /Reason for unlock: Adding rate certification./
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
        it('includes instructions about revising the submission', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /You must revise the submission before CMS can continue reviewing it/
                    ),
                })
            )
        })
    })
    describe('State resubmission email', () => {
        const resubmitData = {
            packageName: 'MCR-VA-CCCPLUS-0002',
            updatedBy: 'bob@example.com',
            updatedAt: new Date('02/01/2022'),
            updatedReason: 'Added rate certification.',
        }
        const user = mockUser()
        const submission = mockContractAndRatesFormData()
        const template = resubmittedStateEmail(
            submission,
            user,
            resubmitData,
            testEmailConfig
        )
        it('contains correct subject and clearly states successful resubmission', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    subject: expect.stringContaining(
                        `${resubmitData.packageName} was resubmitted`
                    ),
                    bodyText: expect.stringMatching(
                        `${resubmitData.packageName} was successfully resubmitted`
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
        it('includes instructions for further changes', () => {
            expect.objectContaining({
                bodyText: expect.stringMatching(
                    /If you need to make any further changes, please contact CMS./
                ),
            })
        })
        it('includes rate name', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(/Rate name:/),
                })
            )
        })
    })
    describe('CMS resubmission email', () => {
        const resubmitData = {
            packageName: 'MCR-VA-CCCPLUS-0002',
            updatedBy: 'bob@example.com',
            updatedAt: new Date('02/01/2022'),
            updatedReason: 'Added rate certification.',
        }
        const submission = mockContractAndRatesFormData()
        const stateAnalystEmails = testStateAnalystsEmails()
        const template = resubmittedCMSEmail(
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
            const template = resubmittedCMSEmail(
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
            const template = resubmittedCMSEmail(
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
    describe('CMS resubmission email without rates', () => {
        const resubmitData = {
            packageName: 'MCR-VA-CCCPLUS-0003',
            updatedBy: 'bob@example.com',
            updatedAt: new Date('02/01/2022'),
            updatedReason: 'Added more contract details.',
        }
        const submission = mockContractOnlyFormData()
        const stateAnalystEmails = testStateAnalystsEmails()
        const contractOnlyTemplate = resubmittedCMSEmail(
            submission,
            resubmitData,
            testEmailConfig,
            stateAnalystEmails
        )

        it('does not include ratesReviewSharedEmails', () => {
            const rateReviewerEmails = [
                ...testEmailConfig.ratesReviewSharedEmails,
            ]
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
            const template = resubmittedCMSEmail(
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
            const template = resubmittedCMSEmail(
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
            const template = resubmittedCMSEmail(
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
})
