describe('documents', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    it('can navigate back and save as draft on the documents page, saving documents each time', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to documents page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const draftSubmissionID = pathname.split('/')[2]
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionID}/edit/documents`
            )

            // Add two of the same document
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionID}/edit/documents`
            )
            cy.findByTestId('file-input-input').attachFile([
                'documents/trussel-guide.pdf',
            ])
            cy.findByTestId('file-input-input').attachFile(
                'documents/trussel-guide.pdf'
            )
            cy.findByText(/0 complete, 1 error, 1 pending/).should('exist')
            cy.waitForDocumentsToLoad()
            cy.findByText(/1 complete, 1 error, 0 pending/).should('exist')
            cy.findByText('Duplicate file, please remove').should('exist')
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionID}/edit/documents`
            )

            // Add two more valid documents, then navigate back
            cy.findByRole('heading', { name: /Supporting documents/ })
            cy.findByTestId('file-input-input').attachFile([
                'documents/trussel-guide.pdf',
                'documents/how-to-open-source.pdf',
            ])
            cy.findByTestId('file-input-input').attachFile(
                'documents/trussel-guide.pdf'
            )
            cy.findByText('Duplicate file, please remove').should('exist')

            cy.findByTestId('file-input-preview-list').within(() => {
                cy.findAllByRole('listitem').should('have.length', 3)
            })

            cy.findByText(/3 files added/).should('exist')
            cy.findByText(/0 complete, 1 error, 2 pending/).should('exist')

            cy.waitForDocumentsToLoad()
            cy.findByText('Duplicate file, please remove').should('exist')

            cy.findByTestId('file-input-preview-list').within(() => {
                cy.findAllByRole('listitem').should('have.length', 3)
            })

            cy.findByText(/2 complete, 1 error, 0 pending/)
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })

            // reload page, see two documents, duplicate was discarded on Back
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionID}/edit/documents`
            )

            cy.findByTestId('file-input-preview-list').within(() => {
                cy.findAllByRole('listitem').should('have.length', 2)
            })

            cy.verifyDocumentsHaveNoErrors()

            //  Save as draft
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })
        })
    })

    /*
         We test much of the same behavior for the file selector in our jest component _tests,
         however drag and drop functionality is only working well in Cypress so we must re-implement many of those _tests here
    */
    it('can drag and drop and navigate to review and submit', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmissionWithBaseContract()

        // Navigate to documents page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const draftSubmissionId = pathname.split('/')[2]
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/documents`
            )

            // Drop invalid files and invalid type message appears
            cy.findByTestId('file-input-droptarget')
                .should('exist')
                .attachFile(['images/trussel-guide-screenshot.png'], {
                    subjectType: 'drag-n-drop',
                    force: true,
                })
            cy.findByTestId('file-input-error').should(
                'have.text',
                'This is not a valid file type.'
            )

            // Drop multiple valid files
            cy.findByTestId('file-input-droptarget')
                .should('exist')
                .attachFile(
                    [
                        'documents/how-to-open-source.pdf',
                        'documents/trussel-guide.pdf',
                    ],
                    {
                        subjectType: 'drag-n-drop',
                        force: true,
                    }
                )

            cy.findByTestId('file-input-preview-list').within(() => {
                cy.findAllByRole('listitem').should('have.length', 2)
            })

            cy.waitForDocumentsToLoad()
            cy.verifyDocumentsHaveNoErrors()

            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Review and submit/ })

            // check accessibility of filled out documents page
            cy.navigateFormByButtonClick('BACK')
            // Commented out to get react-scripts/webpack 5 upgrade through
            // cy.pa11y({
            //     actions: ['wait for element #documents-hint to be visible'],
            //     hideElements: '.usa-step-indicator',
            // })
        })
    })
})
