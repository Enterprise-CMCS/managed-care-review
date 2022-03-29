import {
    testEmailConfig,
    mockContractAmendmentSubmission,
    mockContractOnlySubmission,
    mockContractAndRatesSubmission,
    mockUser
} from '../testHelpers/emailerHelpers'
import {
    StateSubmissionType
} from '../../app-web/src/common-code/domain-models'
import {
    newPackageCMSEmail,
    newPackageStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmittedCMSEmail,
    resubmittedStateEmail
} from './'

describe('Email templates', () => {
    describe('CMS email', () => {
        it('to addresses list includes review email addresses from email config', () => {
            const sub = mockContractOnlySubmission()
            const template = newPackageCMSEmail(
                sub,
                'some-title',
                testEmailConfig
            )
            testEmailConfig.cmsReviewSharedEmails.forEach((emailAddress) => {
                expect(template).toEqual(
                    expect.objectContaining({
                        toAddresses: expect.arrayContaining([
                            emailAddress
                        ]),
                    })
                )
            })
        })

        it('subject line is correct', () => {
            const sub  = mockContractOnlySubmission()
            const name = 'FL-MMA-001'
            const template = newPackageCMSEmail(sub, name, testEmailConfig)
            
            expect(template).toEqual(
                expect.objectContaining({
                    subject: expect.stringContaining(
                        `TEST New Managed Care Submission: ${name}`
                    )
                })
            )
        })


        it('includes warning about unofficial submission', () => {
            const sub = mockContractOnlySubmission()
            const template = newPackageCMSEmail( sub, 'some-title', testEmailConfig)
             expect(template).toEqual(
                 expect.objectContaining({
                     bodyText: expect.stringMatching(
                         /This is NOT an official submission/
                     ),
                 })
             )

        })


        it('includes expected data summary for a contract only submission', () => { 
            const sub: StateSubmissionType  = {
                ...mockContractOnlySubmission(),
                contractDateStart: new Date('01/01/2021'),
                contractDateEnd: new Date('01/01/2025')
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
                      bodyText: expect.stringContaining(
                          'Rating period:'
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


        })
        it('includes expected data summary for a contract and rates submission', () => {
             const sub: StateSubmissionType = {
                 ...mockContractAndRatesSubmission(),
                 contractDateStart: new Date('01/01/2021'),
                 contractDateEnd: new Date('01/01/2025'),
                 rateDateStart: new Date('01/01/2021'),
                 rateDateEnd: new Date('01/01/2022'),
             }
            const template = newPackageCMSEmail(sub, 'some-title', testEmailConfig)
              
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

        })
        it('includes expected data summary for a contract amendment submission', () => {
                 const sub: StateSubmissionType = {
                     ...mockContractAmendmentSubmission(),
                     contractDateStart: new Date('01/01/2021'),
                     contractDateEnd: new Date('01/01/2025'),
                     rateDateStart: new Date('01/01/2021'),
                     rateDateEnd: new Date('01/01/2022'),
                 }
            const template = newPackageCMSEmail(sub, 'some-title', testEmailConfig)
            
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

        })

            it('includes expected data summary for a rate amendment submission', () => {
                const sub: StateSubmissionType = {
                    ...mockContractAndRatesSubmission(),
                    rateType: 'AMENDMENT',
                    contractDateStart: new Date('01/01/2021'),
                    contractDateEnd: new Date('01/01/2025'),
                    rateDateStart: new Date('01/01/2021'),
                    rateDateEnd: new Date('01/01/2022'),
                    rateAmendmentInfo: {
                        effectiveDateStart: new Date('06/05/2021'),
                        effectiveDateEnd:  new Date('12/31/2021')
                    }
                }
                const template = newPackageCMSEmail(sub, 'some-title', testEmailConfig)

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

            })
        it('includes link to submission', () => {
            const sub = mockContractAmendmentSubmission()
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
             const sub = mockContractOnlySubmission()
             const user = mockUser()
             const template = newPackageStateEmail(
                 sub,
                 'some-title',
                 user,
                 testEmailConfig
             )
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining(
                        [ user.email]
                    )
                })
            )
        })

        it('to addresses list includes all state contacts on submission', () => {
            const sub: StateSubmissionType = {...mockContractOnlySubmission(), stateContacts: [{name: 'test1', titleRole: 'Foo1', email: 'test1@example.com'}, {name: 'test2', titleRole: 'Foo2', email: 'test2@example.com'}]}
            const user = mockUser()
            const template = newPackageStateEmail(
                sub,
                'some-title',
                user,
                testEmailConfig
            )
            sub.stateContacts.forEach( contact => {
                 expect(template).toEqual(expect.objectContaining({
                     toAddresses: expect.arrayContaining([contact.email]),
                 }))
            })
    
        })

         
         it('subject line is correct and clearly states submission is complete', () => {
             const sub = mockContractOnlySubmission()
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
             const sub = mockContractOnlySubmission()
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
            const sub = mockContractAmendmentSubmission()
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
            const sub = mockContractAmendmentSubmission()
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
                        'What comes next:'
                    ),
                })
            )
        })

     })
    describe('CMS unlock email', () =>{
        const unlockData = {
            submissionName: 'MCR-VA-CCCPLUS-0001',
            updatedBy: 'leslie@example.com',
            updatedAt: new Date('01/01/2022'),
            updatedReason: 'Adding rate development guide.'
        }
        const template = unlockPackageCMSEmail(
            unlockData,
            testEmailConfig
        )
        it('subject line is correct and clearly states submission is unlocked', () => {
             expect(template).toEqual(
                 expect.objectContaining({
                     subject: expect.stringContaining(
                         `${unlockData.submissionName} was unlocked`
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
                    bodyText: expect.stringMatching(
                        /Unlocked by: leslie/
                    ),
                })
            )
        })
        it('unlocked on includes correct date', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /Unlocked on: 01/
                    ),
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
    describe('State unlock email', () =>{
        const unlockData = {
            submissionName: 'MCR-VA-CCCPLUS-0002',
            updatedBy: 'josh@example.com',
            updatedAt: new Date('02/01/2022'),
            updatedReason: 'Adding rate certification.'
        }
        const sub = mockContractOnlySubmission()
        const template = unlockPackageStateEmail(
            sub,
            unlockData,
            testEmailConfig
        )
        it('subject line is correct and clearly states submission is unlocked', () => {
             expect(template).toEqual(
                 expect.objectContaining({
                     subject: expect.stringContaining(
                         `${unlockData.submissionName} was unlocked by CMS`
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
                    bodyText: expect.stringMatching(
                        /Unlocked by: josh/
                    ),
                })
            )
        })
        it('unlocked on includes correct date', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /Unlocked on: 02/
                    ),
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
            submissionName: 'MCR-VA-CCCPLUS-0002',
            updatedBy: 'bob@example.com',
            updatedAt: new Date('02/01/2022'),
            updatedReason: 'Added rate certification.'
        }
        const user = mockUser()
        const submission = mockContractOnlySubmission()
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
                        `${resubmitData.submissionName} was resubmitted`
                    ),
                    bodyText: expect.stringMatching(
                        `${resubmitData.submissionName} was successfully resubmitted`
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
                    )
                })
            )
        })
        it('Updated on contains correct date', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /Updated on: 02\/01\/2022/
                    )
                })
            )
        })
        it('Changes made contains correct changes made', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /Changes made: Added rate certification./
                    )
                })
            )
        })
        it('includes instructions for further changes', () => {
            expect.objectContaining({
                bodyText: expect.stringMatching(
                    /If you need to make any further changes, please contact CMS./
                )
            })
        })
    })
    describe('CMS resubmission email', () => {
        const resubmitData = {
            submissionName: 'MCR-VA-CCCPLUS-0002',
            updatedBy: 'bob@example.com',
            updatedAt: new Date('02/01/2022'),
            updatedReason: 'Added rate certification.'
        }
        const submission = mockContractOnlySubmission()
        const template = resubmittedCMSEmail(
            submission,
            resubmitData,
            testEmailConfig
        )
        it('contains correct subject and clearly states submission edits are completed', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    subject: expect.stringContaining(
                        `${resubmitData.submissionName} was resubmitted`
                    ),
                    bodyText: expect.stringMatching(
                        `The state completed their edits on submission ${resubmitData.submissionName}`
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
                    )
                })
            )
        })
        it('Updated on contains correct date', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /Updated on: 02\/01\/2022/
                    )
                })
            )
        })
        it('Changes made contains correct changes made', () => {
            expect(template).toEqual(
                expect.objectContaining({
                    bodyText: expect.stringMatching(
                        /Changes made: Added rate certification./
                    )
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
