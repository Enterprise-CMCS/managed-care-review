describe('CMS User can view submission', () => {
    it('logs in without error', () => {
        cy.cmsLogin()

        cy.findByText('CMS USER').should('exist')
    })
})
