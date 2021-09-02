Cypress.Commands.add('login', () => {
    cy.visit('/')
    cy.findByRole('progressbar', { name: 'Loading' }).should('not.exist')
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
        throw new Error(`Auth mode is not defined or is IDM: ${authMode}`)
    }

    // this login/initial fetch can take a little while.
    cy.findByRole('progressbar', { name: 'Loading' }).should('not.exist')
    cy.location('pathname', { timeout: 10_000 }).should('eq', '/')
    cy.findByRole('heading', { level: 1, name: /Dashboard/ })
})

Cypress.Commands.add('cmsLogin', ({ initialURL } = { initialURL: '/' }) => {
    cy.visit(initialURL)
    cy.findByRole('progressbar', { name: 'Loading' }).should('not.exist')
    cy.findByRole('link', { name: 'Sign In' }).click()
    const authMode = Cypress.env('AUTH_MODE')
    console.log(authMode, 'authmode')

    if (authMode === 'LOCAL') {
        cy.findByTestId('ZukoButton').click()
    } else if (authMode === 'AWS_COGNITO') {
        const testUsersPassword = Cypress.env('TEST_USERS_PASS')
        if (!testUsersPassword)
            throw Error('Cannot login test user without a password')
        console.log(testUsersPassword)
        cy.findByText('Show Login Form').click()
        cy.findByTestId('loginEmail').type('zuko@cms.hhs.gov')
        cy.findByTestId('loginPassword').type(testUsersPassword)
        cy.findByRole('button', { name: 'Login' }).click()
    } else {
        throw new Error(`Auth mode is not defined or is IDM: ${authMode}`)
    }

    // this login/initial fetch can take a little while.
    cy.findByRole('progressbar', { name: 'Loading' }).should('not.exist')
    cy.url({ timeout: 10_000 }).should('contain', initialURL)
})
