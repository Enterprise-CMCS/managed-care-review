describe('documents', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
    })
    it('will error in CI when a virus is uploaded', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to documents page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const draftSubmissionID = pathname.split('/')[2]
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionID}/edit/documents`
            )
            cy.findByTestId('file-input-input').attachFile(
                'documents/eicar-adobe-acrobat-attachment.pdf'
            )
            cy.findAllByTestId('upload-finished-indicator', {
                timeout: 120000,
            })
            if (Cypress.env('AUTH_MODE') === 'LOCAL') {
                cy.findByText('Failed security scan, please remove').should(
                    'not.exist'
                )
            } else {
                cy.findByText('Failed security scan, please remove').should(
                    'exist'
                )
            }
        })
    })
})
