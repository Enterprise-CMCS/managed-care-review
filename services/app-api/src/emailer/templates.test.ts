import {
    testEmailConfig,
    mockContractAmendmentFormData,
    mockContractOnlyFormData,
    mockContractAndRatesFormData,
    mockUser,
} from '../testHelpers/emailerHelpers'
import { LockedHealthPlanFormDataType } from '../../../app-web/src/common-code/domain-models'
import {
    newPackageCMSEmail,
    newPackageStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmittedCMSEmail,
    resubmittedStateEmail,
} from './'
import { formatRateNameDate } from '../../../app-web/src/common-code/dateHelpers'
import { unlockedWithFullContracts } from '../../../app-web/src/common-code/domain-mocks'

describe('Email templates', () => {
    describe('CMS email', () => {
        it('to addresses list includes review email addresses from email config', () => {
            const sub = mockContractOnlyFormData()
            const template = newPackageCMSEmail(
                sub,
                'some-title',
                testEmailConfig
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
            const template = newPackageCMSEmail(sub, name, testEmailConfig)

            expect(template).toEqual(
                expect.objectContaining({
                    subject: expect.stringContaining(
                        `TEST New Managed Care Submission: ${name}`
                    ),
                })
            )
        })

        it('includes warning about unofficial submission', () => {
            const sub = mockContractOnlyFormData()
            const template = newPackageCMSEmail(
                sub,
                'some-title',
                testEmailConfig
            )
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /This is NOT an official submission/
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
                testEmailConfig
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

        it('includes expected data summary for a rate amendment submission CMS email', () => {
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
        it('includes link to submission', () => {
            const sub = mockContractAmendmentFormData()
            const template = newPackageCMSEmail(
                sub,
                'some-title',
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
                    subject: expect.stringContaining(
                        `TEST ${name} was sent to CMS`
                    ),
                    bodyText: expect.stringContaining(
                        `${name} was successfully submitted.`
                    ),
                })
            )
        })

        it('includes warning about unofficial submission', () => {
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
                    bodyText: expect.stringMatching(
                        /This is NOT an official submission/
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
        const template = unlockPackageCMSEmail(unlockData, testEmailConfig)
        it('subject line is correct and clearly states submission is unlocked', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    subject: expect.stringContaining(
                        `${unlockData.packageName} was unlocked`
                    ),
                })
            )
        })
        it('includes warning about unofficial submission', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /This is NOT an official submission/
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
    })
    describe('State unlock email', () => {
        const unlockData = {
            packageName: 'MCR-VA-CCCPLUS-0002',
            updatedBy: 'josh@example.com',
            updatedAt: new Date('02/01/2022'),
            updatedReason: 'Adding rate certification.',
        }
        const sub = unlockedWithFullContracts()
        const template = unlockPackageStateEmail(
            sub,
            unlockData,
            testEmailConfig
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
        it('includes warning about unofficial submission', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /This is NOT an official submission/
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
    })
    describe('State resubmission email', () => {
        const resubmitData = {
            packageName: 'MCR-VA-CCCPLUS-0002',
            updatedBy: 'bob@example.com',
            updatedAt: new Date('02/01/2022'),
            updatedReason: 'Added rate certification.',
        }
        const user = mockUser()
        const submission = mockContractOnlyFormData()
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
        it('includes warning about unofficial submission', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /This is NOT an official submission/
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
    })
    describe('CMS resubmission email', () => {
        const resubmitData = {
            packageName: 'MCR-VA-CCCPLUS-0002',
            updatedBy: 'bob@example.com',
            updatedAt: new Date('02/01/2022'),
            updatedReason: 'Added rate certification.',
        }
        const submission = mockContractOnlyFormData()
        const template = resubmittedCMSEmail(
            submission,
            resubmitData,
            testEmailConfig
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
        it('includes warning about unofficial submission', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /This is NOT an official submission/
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
    })
})
