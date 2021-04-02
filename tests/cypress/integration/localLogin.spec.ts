describe('Local login', () => {

    // it('should display test users state', () => {
    //     cy.login()
    //     cy.findByRole('heading', {name: 'Virginia Managed Care Dashboard'}).should('exist')
    // })  

    it('should redirect to dashboard on success', () => {
        cy.login()
        cy.url().should('match', /.*dashboard$/);
    })  
})
