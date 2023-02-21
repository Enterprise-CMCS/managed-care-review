describe.skip('Generate reports', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
    })
    it('CMS user sees option to create report', () => {
        cy.logInAsCMSUser()
        cy.visit('/reports')
        cy.findByText('Download reports').should('exist')
    })
    it('State user sees a 404 on the reports page', () => {
        cy.logInAsStateUser()
        cy.visit('/reports')
        cy.findByText('404 / Page not found').should('exist')
    })
})
