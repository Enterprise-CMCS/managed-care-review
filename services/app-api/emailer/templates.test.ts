import {testEmailConfig, mockContractAmendmentSubmission, mockContractOnlySubmission, mockContractAndRatesSubmission, mockUser} from '../testHelpers/emailerHelpers'
import {
    submissionName,
    StateSubmissionType
} from '../../app-web/src/common-code/domain-models'
import {newPackageCMSEmail, newPackageStateEmail} from './'

describe('Email templates', () => {
    describe('CMS email', () => {
        it('to addresses list includes review email addresses from email config', () => {
            const sub = mockContractOnlySubmission()
            const template = newPackageCMSEmail(
                sub,
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
            const name = submissionName(sub)
            const template = newPackageCMSEmail(sub,testEmailConfig)
            
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
            const template = newPackageCMSEmail( sub, testEmailConfig)
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
            const template = newPackageCMSEmail(sub, testEmailConfig)
              
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
            const template = newPackageCMSEmail(sub, testEmailConfig)
            
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
                }
                const template = newPackageCMSEmail(sub, testEmailConfig)

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
                            'Rate amendment effective dates: 01/01/2021 to 01/01/2022'
                        ),
                    })
                )

            })
        it('includes link to submission', () => {
            const sub = mockContractAmendmentSubmission()
            const template = newPackageCMSEmail(
                sub,
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
             const name = submissionName(sub)
             const user = mockUser()
             const template = newPackageStateEmail(
                 sub,
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
})
