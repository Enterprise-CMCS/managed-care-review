describe('Login', () => {
    it('user can login and logout as expected', () => {
        cy.login()
        cy.url().should('eq', Cypress.config().baseUrl + '/dashboard');
        cy.findByRole('button', {name: /Sign out/i}).should('exist').then( (button) => {
            button.trigger('click')
            cy.location('pathname').should('eq', '/')
            cy.findByRole('link', {name: /Sign In/i}).should('exist')
        }) 
    })  

    it('user can login and see personal dashboard for their state', () => {
        cy.login()
        cy.findByText('aang@dhs.state.mn.us').should('exist')
        cy.findByRole('heading', {name: 'Minnesota Dashboard'}).should('exist')
        cy.findAllByRole('tab', {name: 'MSHO'}).should('exist')
        cy.findAllByRole('tab', {name: 'PMAP'}).should('exist')
        cy.findAllByRole('tab', {name: 'SNBC'}).should('exist')
    })  
})
