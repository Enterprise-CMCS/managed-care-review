Cypress.Commands.add('login', () => {
    cy.visit('/')
    cy.findByText('Sign In').click()
    const authMode = Cypress.env('AUTH_MODE')
    if (authMode === 'LOCAL') {
        cy.findByTestId('AangButton').click()
    } else if (authMode === 'AWS_COGNITO') {
        cy.findByText('Show Login Form').click()
        cy.findByTestId('loginEmail').type('aang@dhs.state.mn.us')
        cy.findByTestId('loginPassword').type('Passw0rd!')
        cy.findByRole('button', {name: 'Login'}).click()
    } else {
        console.log('Auth mode is not defined or is IDM')
    }
    cy.url().should('match', /.*dashboard$/);
  })
  