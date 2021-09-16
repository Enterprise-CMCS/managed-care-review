describe('promote', () => {
    it('can navigate to landing page', () => {
        cy.visit('/')
        cy.get('#App').should('exist')
        cy.get('main').should('exist')
        cy.findByRole('heading', { level: 2, name: /How it works/ })
        cy.findByRole('heading', {
            level: 2,
            name: /You can submit capitation rates and contracts/,
        })
    })
})
