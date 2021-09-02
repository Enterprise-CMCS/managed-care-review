describe('documents', () => {
    it('user can edit documents and save as draft', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()
        cy.navigateForm('Continue')
        cy.findByText(/^MN-PMAP-/).should('exist')

        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const draftSubmissionID = pathname.split('/')[2]
            cy.visit(`/submissions/${draftSubmissionID}/documents`)

            // add valid file and save as draft
            cy.findByTestId('file-input-input').attachFile(
                'documents/how-to-open-source.pdf'
            )
            cy.waitForDocumentsToLoad()
            cy.navigateForm('Save as draft')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // go back to documents page and remove file
            cy.visit(`/submissions/${draftSubmissionID}/documents`)
            cy.findAllByText('Remove').should('exist').first().safeClick()
            cy.findAllByText('how-to-open-source.pdf').should('not.exist')

            // allow Save as Draft with no documents
            cy.navigateForm('Save as draft')
            cy.findByText('You must upload at least one document').should(
                'not.exist'
            )
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // reload page,validate there are still no documents,then add duplicate documents
            cy.visit(`/submissions/${draftSubmissionID}/documents`)
            cy.findByRole('heading', { name: /Documents/ })

            cy.findAllByText('documents/how-to-open-source.pdf').should(
                'not.exist'
            )
            cy.findByTestId('file-input-input').attachFile(
                'documents/trussel-guide.pdf'
            )
            cy.findByTestId('file-input-input').attachFile(
                'documents/trussel-guide.pdf'
            )
            cy.waitForDocumentsToLoad()
            cy.findByText('Duplicate file').should('exist')

            // allow Save as Draft with duplicate files
            cy.navigateForm('Save as draft')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // reload page, see only one file because the duplicate was discarded after Save as Draft
            cy.visit(`/submissions/${draftSubmissionID}/documents`)

            cy.findByText('Duplicate file').should('not.exist')
            cy.findByTestId('file-input-preview-list')
                .findAllByRole('listitem')
                .should('have.length', 1)
            cy.findAllByText('trussel-guide.pdf').should('exist')
        })

        it('user can drag and drop as expected', () => {
            cy.logInAsStateUser()
            cy.startNewContractOnlySubmission()
            cy.navigateForm('Continue')
            cy.findByText(/^MN-PMAP-/).should('exist')

            // visit documents page
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
                // Correct number of files added, no errors
                cy.findByTestId('file-input-preview-list')
                    .findAllByRole('listitem')
                    .should('have.length', 2)
                cy.findByText('Upload failed').should('not.exist')
                cy.findByText('Duplicate file').should('not.exist')

                // Drop one more valid file
                cy.findByTestId('file-input-droptarget')
                    .should('exist')
                    .attachFile(['documents/testing.csv'], {
                        subjectType: 'drag-n-drop',
                    })
                cy.findByTestId('file-input-preview-list')
                    .findAllByRole('listitem')
                    .should('have.length', 3)

                // Add one duplicate file, show one duplicate document error
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
                cy.findAllByText('how-to-open-source.pdf').should(
                    'have.length',
                    2
                )
                cy.findAllByText('Duplicate file').should('have.length', 1)

                // Remove duplicate documents and continue with valid input
                cy.findAllByText('Remove').should('exist').first().safeClick()
                cy.findAllByText('Remove').should('exist').first().safeClick()
                cy.findByTestId('file-input-preview-list')
                    .findAllByRole('listitem')
                    .should('have.length', 2)
                cy.findAllByText('Duplicate file').should('not.exist')
            })
        })
    })
})
