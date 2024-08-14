describe('state user in state submission form', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    it('can navigate forward, back,  and save as draft on each form page', () => {
        // goal of this test is to check every single form page and navigation (going backwards, forwards or save as draft with new info)

        cy.logInAsStateUser()

        // Start a base contract only submissions
        cy.startNewContractOnlySubmissionWithBaseContractV2()

        // Save submission URL
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )

            // CHECK SUBMISSION TYPE PAGE NAVIGATION
            cy.findByRole('heading', {
                level: 2,
                name: /Submission type/,
                timeout: 10_000,
            })

            // Make sure is contract only
            cy.findByLabelText('Contract action and rate certification').should(
                    'not.be.checked'
                )
            cy.findByTestId('step-indicator').findAllByRole('listitem').should('have.length', 5)
            cy.findByText('Rate details').should('not.exist')

            // Navigate back to previous page
            cy.findByRole('button', { name: /Cancel/, timeout: 5_000}).click()
            cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })

            // Link to type page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )

            // Change to contract and rates and contract amendment
            cy.findByLabelText('Contract action and rate certification').check({force: true})
            cy.findByLabelText('Contract action and rate certification').should(
                'be.checked'
            )

            cy.findByLabelText('Amendment to base contract').check({force: true})
            cy.findByLabelText('Amendment to base contract').should('be.checked')
            cy.get('label[for="riskBasedContractNo"]').click()
            cy.findByRole('textbox', { name: 'Submission description' }).clear().type(
                'description of contract only submission with amendment'
            )

            // Save as draft
            cy.navigateContractForm('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })

            // Link to type page and continue forward
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )
            cy.findByTestId('step-indicator').findAllByRole('listitem').should('have.length', 6)
            cy.findByText('Rate details').should('exist')
            cy.navigateContractForm('CONTINUE')

            // CHECK CONTRACT DETAILS PAGE NAVIGATION
            cy.findByRole('heading', { level: 2, name: /Contract details/ })

            // Navigate back to previous page
            cy.deprecatedNavigateV1Form('BACK')
            cy.findByRole('heading', { level: 2, name: /Submission type/ })
            cy.navigateContractForm('CONTINUE')

            // Change to contract amendment, save as draft
            cy.findByRole('heading', { level: 2, name: /Contract details/ })
            cy.fillOutAmendmentToBaseContractDetails()
            cy.deprecatedNavigateV1Form('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })

            // Link to contract details page and continue
               cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/contract-details`
            )
            cy.deprecatedNavigateV1Form('CONTINUE')

            // CHECK RATE DETAILS PAGE NAVIGATION
            cy.findByRole('heading', { level: 2, name: /Rate details/ })

            // Navigate back to previous page
            cy.navigateContractRatesForm('BACK')
            cy.findByRole('heading', { level: 2, name: /Contract details/ })
            cy.deprecatedNavigateV1Form('CONTINUE')

            // Add base rate data, save as draft
            cy.findByRole('heading', { level: 2, name: /Rate details/ })
            cy.fillOutNewRateCertification()
            cy.navigateContractRatesForm('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })

            // Link to rate details page, change to rate amendment, continue
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/rate-details`
            )
            cy.fillOutAmendmentToPriorRateCertification()
            cy.navigateContractRatesForm('CONTINUE')

            // CHECK CONTACTS PAGE NAVIGATION
            cy.findByRole('heading', { level: 2, name: /Contacts/ })

            // Navigate back to previous page
            cy.deprecatedNavigateV1Form('BACK')
            cy.findByRole('heading', { level: 2, name: /Rate details/ })
            cy.navigateContractRatesForm('CONTINUE')

            // Add contact data, save as draft
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.fillOutStateContact()
            cy.deprecatedNavigateV1Form('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })

            // Link to contacts page and continue
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/contacts`
            )
            cy.deprecatedNavigateV1Form('CONTINUE')
            // skip documents page - that will be deleted soon
            cy.deprecatedNavigateV1Form('CONTINUE')

            // Check that we end up on Review and Submit
            cy.findByRole('heading', { level: 2, name: /Review and submit/ })
            cy.findByText('Submitted').should('not.exist')
            cy.findByText('Download all contract documents').should('not.exist')
        })
    })

    it('can not submit an incomplete submission', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to review and submit page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/review-and-submit`)

            cy.submitStateSubmissionForm({success: false})
            cy.findByRole('heading', { level: 4, name: /Submission error/ })
        })
    })

    it('documents handled as expected on rate details page', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const draftSubmissionID = pathname.split('/')[2]

            // Add two of the same document
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionID}/edit/rate-details`
            )
            cy.findByRole('radiogroup', {
                name: /Was this rate certification included with another submission?/,
            })
                .should('exist')
                .within(() => {
                    cy.findByText('No, this rate certification was not included with any other submissions').click()
                })

            const multiSuppportingDocsField = cy.findAllByTestId('file-input-input').last()
            // MCR-4198 - DOC REPLACED IN PLACE FOR SINGLE ITEM FIELD CURRENTLY BROKEN
            // currently showing duplicate field error when it shouldn't
            // const singleDocRateCertField = cy.findAllByTestId('file-input-input').first()
            //singleDocRateCertField.should('exist').attachFile([
            //     'documents/trussel-guide.pdf',
            // ])
            //singleDocRateCertField.should('exist').attachFile([
            //     'documents/trussel-guide.pdf',
            // ])
            // cy.findByText('Duplicate file, please remove').should('not.exist')

            multiSuppportingDocsField.attachFile([
                'documents/trussel-guide.pdf',
            ])
            cy.findByText(/0 complete, 0 errors, 1 pending/)
             multiSuppportingDocsField.attachFile([
                'documents/how-to-open-source.pdf',
            ])
            cy.findByText(/0 complete, 0 errors, 2 pending/)
            cy.waitForDocumentsToLoad()

            // Add two more valid documents
             multiSuppportingDocsField.attachFile([
                'documents/questions_for_submission.pdf',
                'documents/response_to_questions_for_submission.pdf',
            ])

            // Add one more file, a duplicate
             multiSuppportingDocsField.attachFile(
                'documents/trussel-guide.pdf'
            )
            // Files show correct loading states then complete
            cy.findByText('Duplicate file, please remove').should('exist')

            cy.findAllByTestId('file-input-preview-list').last().within(() => {
                cy.findAllByRole('listitem').should('have.length', 5)
            })

            cy.findByText(/4 complete, 1 error, 0 pending/)
            cy.findByText(/5 files added/).should('exist')

            // SAVE ON BACK FOR RATE DETAILS CURRENTLY BROKEN
            // Navigate back, then return,see that valid files remain but duplicate was discarded
            // cy.navigateContractRatesForm('BACK')
            // cy.findByRole('heading', { level: 2, name: /Contract details/ })
            // cy.navigateFormByDirectLink(
            //     `/submissions/${draftSubmissionID}/edit/rate-details`
            // )
            // cy.findByText(/4 files added/).should('exist')
            // cy.findAllByTestId('file-input-preview-list').last().within(() => {
            //     cy.findAllByRole('listitem').should('have.length', 4)
            // })
            // cy.verifyDocumentsHaveNoErrors()

             // Drop invalid file and invalid type message appears
             cy.findAllByTestId('file-input-droptarget').last()
             .should('exist')
             .attachFile(['images/trussel-guide-screenshot.png'], {
                 subjectType: 'drag-n-drop',
                 force: true,
             })
            cy.findByTestId('file-input-error').should(
                'have.text',
                'This is not a valid file type.'
            )
        })
    })
})
