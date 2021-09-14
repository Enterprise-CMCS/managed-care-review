describe('documents', () => {
    it('can navigate to and from documents page, saving documents but discarding duplicates on both "Back" and "Save as draft" actions', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()

        // Navigate to documents page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const draftSubmissionID = pathname.split('/')[2]
            cy.visit(`/submissions/${draftSubmissionID}/documents`)

            // Add two valid documents and one duplicate, then navigate back
            cy.visit(`/submissions/${draftSubmissionID}/documents`)
            cy.findByRole('heading', { name: /Documents/ })
            cy.findByTestId('file-input-input').attachFile([
                'documents/trussel-guide.pdf',
                'documents/how-to-open-source.pdf',
            ])
            cy.findByTestId('file-input-input').attachFile(
                'documents/trussel-guide.pdf'
            )
            cy.waitForDocumentsToLoad()
            cy.findByText('Duplicate file').should('exist')
            cy.findByTestId('file-input-preview-list')
                .findAllByRole('listitem')
                .should('have.length', 3)
            cy.navigateForm('Back')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })

            // reload page, see two documents, duplicate was discarded
            cy.visit(`/submissions/${draftSubmissionID}/documents`)
            cy.findByTestId('file-input-preview-list')
                .findAllByRole('listitem')
                .should('have.length', 2)
            cy.verifyDocumentsHaveNoErrors()

            // Add a new valid document and another duplicate document, and click Save as draft
            cy.visit(`/submissions/${draftSubmissionID}/documents`)
            cy.findByRole('heading', { name: /Documents/ })
            cy.findByTestId('file-input-input').attachFile([
                'documents/how-to-open-source.pdf',
                'documents/testing.csv',
            ])
            cy.waitForDocumentsToLoad()
            cy.findByText('Duplicate file').should('exist')
            cy.findByTestId('file-input-preview-list')
                .findAllByRole('listitem')
                .should('have.length', 4)
            cy.navigateForm('Save as draft')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // Reload page, see duplicate was discarded
            cy.visit(`/submissions/${draftSubmissionID}/documents`)
            cy.findByTestId('file-input-preview-list')
                .findAllByRole('listitem')
                .should('have.length', 3)
            cy.verifyDocumentsHaveNoErrors()
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

            // Continue button shows error, no documents
            cy.navigateForm('Continue')
            cy.findByText('You must upload at least one document').should(
                'exist'
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
            cy.findAllByTestId('file-input-preview-image').should(
                'have.length',
                2
            )
            cy.waitForDocumentsToLoad()
            cy.verifyDocumentsHaveNoErrors()

            // Correct number of files added, no errors
            cy.findByTestId('file-input-preview-list')
                .findAllByRole('listitem')
                .should('have.length', 2)

            // Drop one more valid file
            cy.findByTestId('file-input-droptarget')
                .should('exist')
                .attachFile(['documents/testing.csv'], {
                    subjectType: 'drag-n-drop',
                })
            cy.findByTestId('file-input-preview-list')
                .findAllByRole('listitem')
                .should('have.length', 3)

            // Add a duplicate file, should show a duplicate document error
            cy.findByTestId('file-input-input').attachFile(
                ['documents/how-to-open-source.pdf'],
                {
                    subjectType: 'drag-n-drop',
                    force: true,
                }
            )
            cy.findByTestId('file-input-preview-list')
                .findAllByRole('listitem')
                .should('have.length', 4)
            cy.findAllByText('how-to-open-source.pdf').should('have.length', 2)
            cy.findAllByText('Duplicate file').should('have.length', 1)

            // Remove duplicate documents and continue with valid input
            cy.findAllByText('Remove').should('exist').first().safeClick()
            cy.findAllByText('Remove').should('exist').first().safeClick()
            cy.findByTestId('file-input-preview-list')
                .findAllByRole('listitem')
                .should('have.length', 2)
            cy.verifyDocumentsHaveNoErrors()

            cy.navigateForm('Continue')
            cy.findByRole('heading', { level: 2, name: /Review and submit/ })
        })
    })
})
