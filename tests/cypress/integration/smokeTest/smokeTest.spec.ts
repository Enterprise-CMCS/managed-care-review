describe('smoke test', () => {
    it('can log in as a state user', () => {
        cy.loginAsStateUser()
        cy.url().should('eq', Cypress.config().baseUrl + '/dashboard')
    })

    it('can contact the API and connect to the database', () => {
        cy.loginAsStateUser()

        cy.startNewContractOnlySubmission()
        cy.navigateForm('Continue')
        cy.findByText(/^MN-PMAP-/).should('exist')
    })

    // HM-TODO: Write test to log in as a CMS user
    it('can log in as a CMS user', () => {})
})
