describe('smoke test', () => {
    it('can log in as a state user', () => {
        cy.logInAsStateUser()
        cy.waitForLoadingToComplete()
        cy.location('pathname', { timeout: 10_000 }).should('eq', '/')
        cy.findByRole('heading', { level: 1, name: /Dashboard/ })
    })

    it('can log in as a CMS user', () => {
        cy.logInAsCMSUser({ initialURL: '/' })
        cy.waitForLoadingToComplete()
        cy.url({ timeout: 10_000 }).should('contain', '/')
    })

    it('can contact the API and connect to the database', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()
    })
})
