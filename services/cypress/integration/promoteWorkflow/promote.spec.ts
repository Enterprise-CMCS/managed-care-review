describe('promote', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
    })
    it('can navigate to landing page', () => {
        cy.visit('/')
        cy.get('#App').should('exist')
        cy.get('main').should('exist')
        cy.findByRole('heading', { level: 2, name: /How it works/ })
        cy.findByRole('heading', {
            level: 2,
            name: /You can use MC-Review to submit Medicaid and CHIP managed care health plan contracts and rates to CMS. This portal accepts:/i,
        })
    })
})
