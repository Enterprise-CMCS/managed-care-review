describe('submission type', () => {
    it('can navigate to and from new page', () => {
        cy.logInAsStateUser()

        // Navigate to new page
        cy.visit(`/submissions/new`)

        // Navigate to dashboard page by clicking cancel
        cy.findByRole('link', { name: /Cancel/ }).click()
        cy.findByRole('heading', { level: 1, name: /Dashboard/ })

        // Navigate to new page
        cy.visit(`/submissions/new`)

        cy.fillOutContractActionOnlySubmissionType()

        // Navigate to contract details page by clicking continue for a contract only submission
        cy.navigateForm('Continue')
        cy.findByRole('heading', { level: 2, name: /Contract details/ })
    })
})
