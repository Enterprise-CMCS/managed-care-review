describe('login', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    it('can log in and log out as expected', () => {
        cy.logInAsStateUser()

        cy.url().should('eq', Cypress.config().baseUrl + '/dashboard/submissions')
        cy.findByRole('button', { name: /Sign out/i }).safeClick()

        cy.location('pathname').should('eq', '/')
        cy.findByRole('link', { name: /Sign In/i }).should('exist')
    })

    it('can log in and see personal dashboard for their state', () => {
        cy.logInAsStateUser()

        cy.findByText('aang@example.com').should('exist')
        cy.findByRole('heading', { name: 'Minnesota Submissions dashboard' }).should(
            'exist'
        )
    })
})
