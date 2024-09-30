Cypress.Commands.add('logInAsStateUser', () => {
    // Set up gql intercept for requests on app load

    cy.visit('/')
    cy.findByText('Medicaid and CHIP Managed Care Reporting and Review System')
    cy.findByRole('link', { name: 'Sign In', timeout: 20_000 }).click()
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
    cy.wait(['@fetchCurrentUserQuery', '@indexContractsQuery'], {
        timeout: 80_000,
    })
    cy.findByTestId('state-dashboard-page', { timeout: 10_000 }).should('exist')
    cy.findByText('Start new submission').should('exist')
})

Cypress.Commands.add(
    'logInAsCMSUser',
    ({ initialURL } = { initialURL: '/' }) => {
        cy.visit('/auth')

        //Add assertion looking for test on the page before findByRole
        cy.findByText(
            'Medicaid and CHIP Managed Care Reporting and Review System'
        )
        // cy.findByRole('link', { name: 'Sign In' }).click()
        const authMode = Cypress.env('AUTH_MODE')

        if (authMode === 'LOCAL') {
            cy.findByTestId('ZukoButton').click()
        } else if (authMode === 'AWS_COGNITO') {
            const testUsersPassword = Cypress.env('TEST_USERS_PASS')
            if (!testUsersPassword)
                throw Error('Cannot login test user without a password')
            cy.findByText('Show Login Form').click()
            cy.findByTestId('loginEmail').type('zuko@example.com')
            cy.findByTestId('loginPassword').type(testUsersPassword)
            cy.findByRole('button', { name: 'Login' })
                .click()
        } else {
            throw new Error(`Auth mode is not defined or is IDM: ${authMode}`)
        }

        cy.wait('@fetchCurrentUserQuery', { timeout: 20_000 })
        cy.wait('@indexContractsQuery', { timeout: 80_000 })
        cy.findByTestId('cms-dashboard-page', { timeout: 10_000 }).should(
            'exist'
        )

        if (initialURL !== '/') {
            cy.visit(initialURL)
            cy.url({ timeout: 20_000 }).should('contain', initialURL)

            if (initialURL.includes('submissions/')) {
                cy.wait('@fetchContractWithQuestionsQuery', {
                    timeout: 20_000,
                }) // for cases where CMs user goes to specific submission on login, likely from email link
            } else if (initialURL.includes('rate-reviews')) {
                cy.wait('@indexRatesQuery', { timeout: 80_000 })
                cy.findByTestId('cms-dashboard-page', { timeout: 10_000 }).should(
                    'exist'
                )
                cy.findByRole('heading', { name: /rate reviews/ }).should('exist')
            } else {
                cy.wait('@indexContractsQuery', { timeout: 80_000 })
            }
        }
    }
)

Cypress.Commands.add(
    'logInAsAdminUser',
    ({ initialURL } = { initialURL: '/' }) => {
        cy.visit(initialURL)

        cy.findByText(
            'Medicaid and CHIP Managed Care Reporting and Review System'
        )
        cy.findByRole('link', { name: 'Sign In' }).click()
        const authMode = Cypress.env('AUTH_MODE')

        if (authMode === 'LOCAL') {
            cy.findByTestId('IrohButton').click()
        } else if (authMode === 'AWS_COGNITO') {
            const testUsersPassword = Cypress.env('TEST_USERS_PASS')
            if (!testUsersPassword)
                throw Error('Cannot login test user without a password')
            console.info(testUsersPassword)
            cy.findByText('Show Login Form').click()
            cy.findByTestId('loginEmail').type('iroh@example.com')
            cy.findByTestId('loginPassword').type(testUsersPassword)
            cy.findByRole('button', { name: 'Login' }).click()
        } else {
            throw new Error(`Auth mode is not defined or is IDM: ${authMode}`)
        }
        cy.wait('@fetchCurrentUserQuery', { timeout: 20_000 })
        cy.url({ timeout: 20_000 }).should('contain', initialURL)

        if (initialURL === '/mc-review-settings') {
            cy.getFeatureFlagStore(['read-write-state-assignments']).then(
                (store) => {
                    if(store['read-write-state-assignments']) {
                        cy.wait('@fetchMcReviewSettingsQuery')
                    } else {
                        cy.wait('@fetchEmailSettingsQuery')
                    }
                }
            )
        } else if (initialURL?.includes('submissions')) {
            cy.wait('@fetchHealthPlanPackageQuery', { timeout: 20_000 })
        } else {
            cy.wait('@indexContractsQuery', { timeout: 80_000 })
            cy.findByTestId('cms-dashboard-page', { timeout: 10_000 }).should(
                'exist'
            )
            cy.findByRole('heading', { name: 'Submissions' }).should('exist')
        }
    }
)

Cypress.Commands.add('logOut', () => {
    cy.findByRole('button', { name: 'Your account' }).should('exist').click()
    cy.findByRole('button', { name: 'Sign out' }).should('exist').click()
    cy.findByText(
        'Medicaid and CHIP Managed Care Reporting and Review System',
        { timeout: 20_000 }
    )
})
