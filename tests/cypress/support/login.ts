Cypress.Commands.add('login', () => {
    cy.visit('/')
    cy.findByRole('progressbar', { name: 'Loading' }).should('not.exist')
    cy.log('Clicking Sign In')
    cy.findByRole('link', { name: 'Sign In' }).click()
    cy.log('Clicked Sign In')
    cy.findByRole('link', { name: 'Sign In' }).click()
    const authMode = Cypress.env('AUTH_MODE')
    console.log(authMode, 'authmode')
    if (authMode === 'LOCAL') {
        cy.findByTestId('AangButton').click()
    } else if (authMode === 'AWS_COGNITO') {
        const testUsersPassword = Cypress.env('TEST_USERS_PASS')
        if (!testUsersPassword)
            throw Error('Cannot login test user without a password')
        console.log(testUsersPassword)
        cy.findByText('Show Login Form').click()
        cy.findByTestId('loginEmail').type('aang@dhs.state.mn.us')
        cy.findByTestId('loginPassword').type(testUsersPassword)
        cy.findByRole('button', { name: 'Login' }).click()
    } else {
        console.log('Auth mode is not defined or is IDM')
    }
    // this login/initial fetch can take a little while.
    cy.findByRole('progressbar', { name: 'Loading' }).should('not.exist')
    cy.url({ timeout: 10_000 }).should('match', /.*dashboard$/)
    cy.findByRole('heading', { level: 1, name: /Dashboard/ })
})
