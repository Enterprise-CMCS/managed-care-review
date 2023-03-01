import { aliasQuery } from '../utils/graphql-test-utils'

Cypress.Commands.add('logInAsStateUser', () => {
    // Set up gql intercept for requests on app load
    cy.intercept('POST', '*/graphql', (req) => {
        aliasQuery(req, 'fetchCurrentUser')
        aliasQuery(req, 'indexHealthPlanPackages')
    })

    cy.visit('/')
    cy.findByText('Medicaid and CHIP Managed Care Reporting and Review System')
    cy.findByRole('link', { name: 'Sign In', timeout: 20000 }).click()
    const authMode = Cypress.env('AUTH_MODE')
    console.info(authMode, 'authmode')

    if (authMode === 'LOCAL') {
        cy.findByTestId('AangButton').click()
    } else if (authMode === 'AWS_COGNITO') {
        const testUsersPassword = Cypress.env('TEST_USERS_PASS')
        if (!testUsersPassword)
            throw Error('Cannot login test user without a password')
        console.info(testUsersPassword)
        cy.findByText('Show Login Form').click()
        cy.findByTestId('loginEmail').type('aang@example.com')
        cy.findByTestId('loginPassword').type(testUsersPassword)
        cy.findByRole('button', { name: 'Login' }).click()
    } else {
        throw new Error(`Auth mode is not defined or is IDM: ${authMode}`)
    }
    //Wait for both queries to finish.
    cy.wait(['@fetchCurrentUserQuery', '@indexHealthPlanPackagesQuery'], {
        timeout: 80000,
    })
})

Cypress.Commands.add(
    'logInAsCMSUser',
    ({ initialURL } = { initialURL: '/' }) => {
        cy.intercept('POST', '*/graphql', (req) => {
            aliasQuery(req, 'fetchCurrentUser')
            aliasQuery(req, 'fetchHealthPlanPackage')
            aliasQuery(req, 'fetchHealthPlanPackageWithQuestions')
            aliasQuery(req, 'indexHealthPlanPackages')
        })

        const initialURLPath = initialURL?.replace(/^(?:\S+\.\S+?\/|\/)/, '') || '/'

        cy.visit(initialURLPath)
        //Add assertion looking for test on the page before findByRole
        cy.findByText(
            'Medicaid and CHIP Managed Care Reporting and Review System'
        )
        cy.findByRole('link', { name: 'Sign In' }).click()
        const authMode = Cypress.env('AUTH_MODE')
        console.info(authMode, 'authmode')

        if (authMode === 'LOCAL') {
            cy.findByTestId('ZukoButton').click()
        } else if (authMode === 'AWS_COGNITO') {
            const testUsersPassword = Cypress.env('TEST_USERS_PASS')
            if (!testUsersPassword)
                throw Error('Cannot login test user without a password')
            console.info(testUsersPassword)
            cy.findByText('Show Login Form').click()
            cy.findByTestId('loginEmail').type('zuko@example.com')
            cy.findByTestId('loginPassword').type(testUsersPassword)
            cy.findByRole('button', { name: 'Login' }).click()
        } else {
            throw new Error(`Auth mode is not defined or is IDM: ${authMode}`)
        }
        cy.wait('@fetchCurrentUserQuery', { timeout: 20000 })
        if (initialURLPath === '/') {
            cy.wait('@indexHealthPlanPackagesQuery', { timeout: 80000 })
        } else if (initialURLPath) {
            const pathnameArray = initialURLPath.split('/')

            // Check for submission summary page. Url should split into array of 3 strings. Second should be
            // 'submissions` and third should be anything expect 'new'.
            const isSubmissionSummaryPage = pathnameArray.length === 3 && pathnameArray[1] === 'submissions' && pathnameArray[2] !== 'new'

            // Check for QA pages. Url should split into array of at least 4 strings where the 4th string is 'question-and-answers'
            const isQAPages = pathnameArray.length >= 4 && pathnameArray[3] === 'question-and-answers'

            // QA and Submission Summary page uses a different graphql query
            if (isSubmissionSummaryPage || isQAPages) {
                cy.wait('@fetchHealthPlanPackageWithQuestionsQuery', { timeout: 20000 })
            } else {
                cy.wait('@fetchHealthPlanPackageQuery', { timeout: 20000 }) // for cases where CMs user goes to specific submission on login
            }
        } else {
            cy.wait('@fetchHealthPlanPackageQuery', { timeout: 20000 })
        }
    }
)
