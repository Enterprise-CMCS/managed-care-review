describe.only('documents', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    if (Cypress.env('AUTH_MODE') !== 'LOCAL') {
        it('will error in CI when a virus is uploaded', () => {
            cy.logInAsStateUser()
            cy.startNewContractAndRatesSubmission()

            // Navigate to documents page
            cy.location().then((fullUrl) => {
                const { pathname } = fullUrl
                const draftSubmissionID = pathname.split('/')[2]

                cy.navigateFormByDirectLink(
                    `/submissions/${draftSubmissionID}/edit/type`
                )
                cy.navigateContractForm('CONTINUE')

                // Upload a good file and a bad file
                const fileInput = cy.findAllByTestId('file-input-input')
                fileInput.attachFile(['documents/trussel-guide.pdf'])
                cy.findByText(/0 complete, 0 errors, 1 pending/)

                fileInput.attachFile({
                    filePath: 'documents/eicar_com.pdf',
                    encoding: 'binary',
                })
                cy.findByText(/0 complete, 0 errors, 2 pending/)
                cy.waitForDocumentsToLoad()

                cy.findByText(/1 complete, 1 error, 0 pending/).should('exist')

                cy.findByText('Failed security scan, please remove', {
                    timeout: 200_000,
                }).should('exist')
            })
        })
    }
})
