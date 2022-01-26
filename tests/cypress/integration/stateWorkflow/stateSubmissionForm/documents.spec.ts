describe('documents', () => {
    it('can navigate to and from the documents page, saving documents each time', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()

        // Navigate to documents page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const draftSubmissionID = pathname.split('/')[2]
            cy.visit(`/submissions/${draftSubmissionID}/documents`)

            // Add two of the same document
            cy.visit(`/submissions/${draftSubmissionID}/documents`)
            cy.findByTestId('file-input-input').attachFile([
                'documents/trussel-guide.pdf'
            ])
            cy.findByTestId('file-input-input').attachFile(
                'documents/trussel-guide.pdf'
            )
            cy.findByText(/0 complete, 1 error, 1 pending/).should('exist')
            // give the page time to load (wait) then let cypress wait for the spinner to go away
            cy.findByTestId('upload-finished-indicator')
            cy.findByTestId('file-input-loading-image').should('not.exist')
            cy.findByText(/1 complete, 1 error, 0 pending/).should('exist')
            cy.findByText('Duplicate file').should('exist')
            cy.visit(`/submissions/${draftSubmissionID}/documents`)

            // Add two more valid documents, then navigate back
            cy.findByRole('heading', { name: /Supporting documents/ })
            cy.findByTestId('file-input-input').attachFile([
                'documents/trussel-guide.pdf',
                'documents/how-to-open-source.pdf',
            ])
            cy.findByTestId('file-input-input').attachFile(
                'documents/trussel-guide.pdf'
            )
            cy.findByText('Duplicate file').should('exist')
            cy.findAllByRole('row').should('have.length', 4)

            cy.findByText(/3 files added/).should('exist')
            cy.findByText(/0 complete, 1 error, 2 pending/).should('exist')

            // give the page time to load (wait) then let cypress wait for the spinner to go away
            cy.findByTestId('upload-finished-indicator')
            cy.findByTestId('file-input-loading-image').should('not.exist')
            cy.findByText('Duplicate file').should('exist')
            cy.findAllByRole('row').should('have.length', 4)
            cy.findByText(/2 complete, 1 error, 0 pending/)
            cy.navigateForm('Back')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })

            // reload page, see two documents, duplicate was discarded on Back
            cy.visit(`/submissions/${draftSubmissionID}/documents`)
            cy.findAllByRole('row').should('have.length', 3)
            cy.verifyDocumentsHaveNoErrors()

            //  Save as draft
            cy.navigateForm('Save as draft')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })
        })
    })

    /*
         We test much of the same behavior for the file selector in our jest component tests,
         however drag and drop functionality is only working well in Cypress so we must re-implement many of those tests here
    */
    it('can drag and drop and navigate to review and submit', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()

        // Navigate to documents page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const draftSubmissionId = pathname.split('/')[2]
            cy.visit(`/submissions/${draftSubmissionId}/documents`)

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
                        'documents/testing.docx',
                    ],
                    {
                        subjectType: 'drag-n-drop',
                        force: true,
                    }
                )
            cy.findAllByRole('row').should(
                'have.length',
                3
            )
            // give the page time to load (wait) then let cypress wait for the spinner to go away
            cy.findByTestId('upload-finished-indicator')
            cy.findByTestId('file-input-loading-image').should('not.exist')
            cy.verifyDocumentsHaveNoErrors()

            cy.navigateForm('Continue')
            cy.findByRole('heading', { level: 2, name: /Review and submit/ })
        })
    })
})
