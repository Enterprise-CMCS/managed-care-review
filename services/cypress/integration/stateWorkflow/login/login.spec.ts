describe('login', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    it('can log in and log out as expected without accessibility violations', () => {
        cy.logInAsStateUser()

        cy.url().should('eq', Cypress.config().baseUrl + '/dashboard/submissions')
        cy.findByRole('button', { name: 'Your account' }).should('exist').click()

        cy.injectAxe()
        cy.checkA11yWithWcag22aa()

        cy.findByRole('button', { name: /Sign out/i }).safeClick()

        cy.injectAxe()
        cy.checkA11yWithWcag22aa()

        cy.location('pathname').should('eq', '/')
        cy.findByRole('link', { name: /Sign In/i }).should('exist')

        cy.injectAxe()
        cy.checkA11yWithWcag22aa()
    })

    it('can log in and see personal dashboard for their state', () => {
        cy.logInAsStateUser()

        cy.findByText('aang@example.com').should('exist')
        cy.findByRole('heading', { name: 'Minnesota Submissions dashboard' }).should(
            'exist'
        )
    })
})
