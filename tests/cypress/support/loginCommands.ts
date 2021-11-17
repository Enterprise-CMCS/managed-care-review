import { aliasQuery } from '../utils/graphql-test-utils'

Cypress.Commands.add('logInAsStateUser', () => {
    // Set up gql intercept for requests on app load
    cy.intercept('POST', '*/graphql', (req) => {
        aliasQuery(req, 'fetchCurrentUser')
        aliasQuery(req, 'indexSubmissions')
    })

    cy.visit('/')
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
    cy.wait('@fetchCurrentUserQuery')
    cy.wait('@indexSubmissionsQuery') // this is the first request that engages the db
})

Cypress.Commands.add(
    'logInAsCMSUser',
    ({ initialURL } = { initialURL: '/' }) => {
        cy.visit(initialURL)
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
        cy.waitForApiToLoad()
    }
)
