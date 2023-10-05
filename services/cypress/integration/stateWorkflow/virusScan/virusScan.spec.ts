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
                    `/submissions/${draftSubmissionID}/edit/documents`
                )
                cy.findByTestId('file-input-input').attachFile({
                    filePath: 'documents/eicar_com.pdf',
                    encoding: 'binary',
                })
                cy.findByText('Failed security scan, please remove', {
                    timeout: 200_000,
                }).should(
                    'exist'
                )
            })
        })
    }
})
