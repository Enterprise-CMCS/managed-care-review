describe('Local login', () => {

    it('should redirect to dashboard on success', () => {
        cy.visit('/auth')
        cy.get('#App').should('exist')
        cy.findByTestId('TophButton').click()
        cy.url().should('eq', 'http://localhost:3000/dashboard');
    })  

    it('should display Toph user info after login and remove Toph user info on logout', () => {
        cy.visit('/auth')
        cy.get('#App').should('exist')
        cy.findByTestId('TophButton').click()
        cy.findByRole('heading', {name: 'Virginia Managed Care Dashboard'}).should('exist')
    })  
})
