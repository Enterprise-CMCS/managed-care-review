import { aliasQuery } from '../utils/graphql-test-utils'

Cypress.Commands.add('logInAsStateUser', () => {
    // Set up gql intercept for requests on app load
    cy.intercept('POST', '*/graphql', (req) => {
        aliasQuery(req, 'fetchCurrentUser')
        aliasQuery(req, 'indexHealthPlanPackages')
    })

    cy.visit('/')
    cy.findByText(
        'Medicaid and CHIP Managed Care Reporting and Review System'
    )
    cy.findByRole('link', { name: 'Sign In', timeout: 20000 }).click()
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
        cy.findByTestId('loginEmail').type('aang@example.com')
        cy.findByTestId('loginPassword').type(testUsersPassword)
        cy.findByRole('button', { name: 'Login' }).click()
    } else {
        throw new Error(`Auth mode is not defined or is IDM: ${authMode}`)
    }
    //Wait for both queries to finish.
    cy.wait(['@fetchCurrentUserQuery', '@indexHealthPlanPackagesQuery'], { timeout: 80000 })
})

Cypress.Commands.add(
    'logInAsCMSUser',
    ({ initialURL } = { initialURL: '/' }) => {
        cy.intercept('POST', '*/graphql', (req) => {
            aliasQuery(req, 'fetchCurrentUser')
            aliasQuery(req, 'fetchHealthPlanPackage')
            aliasQuery(req, 'indexHealthPlanPackages')
        })

        cy.visit(initialURL)
        //Add assertion looking for test on the page before findByRole
        cy.findByText(
            'Medicaid and CHIP Managed Care Reporting and Review System'
        )
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
            cy.findByTestId('loginEmail').type('zuko@example.com')
            cy.findByTestId('loginPassword').type(testUsersPassword)
            cy.findByRole('button', { name: 'Login' }).click()
        } else {
            throw new Error(`Auth mode is not defined or is IDM: ${authMode}`)
        }
        cy.wait('@fetchCurrentUserQuery', { timeout: 20000 })
        if (initialURL !== '/') {
            cy.wait('@fetchHealthPlanPackageQuery', { timeout: 20000 }) // for cases where CMs user goes to specific submission on login
        } else {
            cy.wait('@indexHealthPlanPackagesQuery', { timeout: 80000 })
        }
    }
)
