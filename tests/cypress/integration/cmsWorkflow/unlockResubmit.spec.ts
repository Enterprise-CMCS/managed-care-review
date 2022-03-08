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

            // Login as CMS User
            cy.findByRole('button', { name: 'Sign out' }).click()
            cy.findByText(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )
            cy.logInAsCMSUser({ initialURL: reviewURL })

            // click on the unlock button and confirm
            cy.findByRole('button', { name: 'Unlock submission' }).click()
            cy.findByRole('button', { name: 'Submit' }).click()
            cy.findByRole('button', { name: 'Unlock submission' }).should(
                'be.disabled'
            )

            cy.wait(2000) 

            // Login as state user
            cy.findByRole('button', { name: 'Sign out' }).click()

            cy.findByText(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )

            cy.logInAsStateUser()

            // state user sees unlocked submission - check tag then submission link
            cy.findByText('Dashboard').should('exist')
            cy.get('table')
                .should('exist')
                .findAllByTestId('submission-status')
                .first()
                .should('have.text', 'Unlocked')

            cy.get('table')
                .findAllByTestId('submission-id')
                .first()
                .find('a')
                .should('have.attr', 'href')
                .and('include', 'review-and-submit')

            cy.visit(reviewURL)

            // state user can resubmit and see resubmitted package in dashboard
            cy.intercept('POST', '*/graphql').as('gqlRequest2')
            cy.submitStateSubmissionForm()
            cy.wait('@gqlRequest2')
            cy.findByText('Dashboard').should('exist')
            
          cy.get('table')
              .should('exist')
              .findAllByTestId('submission-status')
              .first()
              .should('have.text', 'Submitted')

          cy.get('table')
              .findAllByTestId('submission-id')
              .first()
              .find('a')
              .should('have.attr', 'href')
              .and('not.include', 'review-and-submit')

            // Login as CMS User
            cy.findByRole('button', { name: 'Sign out' }).click()
            cy.findByText(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )
            cy.logInAsCMSUser({ initialURL: reviewURL })

            //  CMS user sees resubmitted submission and active unlock button
            cy.findByRole('button', { name: 'Unlock submission' }).should(
                'not.be.disabled'
            )
            
        })
       
    })
})
