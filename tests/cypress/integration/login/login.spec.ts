describe('login', () => {
    it('user can login and logout as expected', () => {
        cy.logInAsStateUser()
        cy.url().should('eq', Cypress.config().baseUrl + '/')
        cy.findByRole('button', { name: /Sign out/i })
            .should('exist')
            .safeClick()
        cy.location('pathname').should('eq', '/')
        cy.findByRole('link', { name: /Sign In/i }).should('exist')
    })

    it('user can login and see personal dashboard for their state', () => {
        cy.logInAsStateUser()
        cy.findByText('aang@dhs.state.mn.us').should('exist')
        cy.findByRole('heading', { name: 'Minnesota Dashboard' }).should(
            'exist'
        )
        cy.findAllByRole('tab', { name: 'MSHO' }).should('exist')
        cy.findAllByRole('tab', { name: 'PMAP' }).should('exist')
        cy.findAllByRole('tab', { name: 'SNBC' }).should('exist')
    })
})
