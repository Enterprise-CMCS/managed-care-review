import * as path from 'path'

describe('dashboard', () => {
    it('can unlock and resubmit', () => {
        cy.logInAsStateUser()

        // a submitted submission
        cy.startNewContractOnlySubmission()

        cy.fillOutBaseContractDetails()
        cy.navigateForm('Continue')

        cy.fillOutStateContact()
        cy.navigateForm('Continue')

        // Skip supporting documents
        cy.findByRole('heading', {name: /Supporting documents/}).should('exist')
        cy.navigateForm('Continue')
        cy.findByRole('heading', {name: /Review and submit/}).should('exist')

        // Store submission url for reference later
        cy.location().then((fullUrl) => {

            const reviewURL = fullUrl.toString()
            fullUrl.pathname = path.dirname(fullUrl)
            const summaryURL = fullUrl.toString()

            // Submit, sent to dashboard
            cy.intercept('POST', '*/graphql').as('gqlRequest')
            cy.submitStateSubmissionForm()
            cy.wait('@gqlRequest')
            cy.findByText('Dashboard').should('exist')
            cy.findByText('Programs').should('exist')

            // visit the url as a CMS User
            cy.findByRole('button', {name: 'Sign out'}).click()
            cy.findByText('Medicaid and CHIP Managed Care Reporting and Review System')
            cy.logInAsCMSUser({initialURL: reviewURL})

            // click on the unlock button
            cy.findByRole('button', { name: 'Unlock submission' }).click()
            // and then the modal
            cy.findByRole('button', { name: 'Submit' }).click()

            cy.findByRole('button', { name: 'Unlock submission' }).should('be.disabled')
            cy.wait(2000) // Unclear why this is needed, but I don't care enough about figuring out
                                // cognito logout to care. 

            // login as the state user again
            cy.findByRole('button', {name: 'Sign out'}).click()

            cy.findByText('Medicaid and CHIP Managed Care Reporting and Review System')

            cy.logInAsStateUser()

            cy.findByText('Dashboard').should('exist')

            cy.visit(reviewURL)

            // Submit, sent to dashboard
            cy.intercept('POST', '*/graphql').as('gqlRequest2')
            cy.submitStateSubmissionForm()
            cy.wait('@gqlRequest2')
            cy.findByText('Dashboard').should('exist')
            cy.findByText('Programs').should('exist')

        })
        // View submission summary
        
    })
})
