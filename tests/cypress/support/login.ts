Cypress.Commands.add('login', () => {
    cy.visit('/')
    cy.findByText('Sign In').click()
    const authMode = Cypress.env('AUTH_MODE')
    if (authMode === 'LOCAL') {
        cy.findByTestId('TophButton').click()
    } else if (authMode === 'AWS_COGNITO') {
        cy.findByText('Show Login Form').click()
        cy.findByTestId('loginEmail').type('hana@truss.works')
        cy.findByTestId('loginPassword').type('Test123!')
        cy.findByRole('button', {name: 'Login'}).click()
    } else {
        console.log('IDM')
    }
    // cy.url().should('match', /.*dashboard$/);
  })
  