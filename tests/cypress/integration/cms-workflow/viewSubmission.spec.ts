describe('CMS User can view submission', () => {
    it('logs in without error', () => {
        cy.visit('/')
        cy.get('#App').should('exist')
    })
})
