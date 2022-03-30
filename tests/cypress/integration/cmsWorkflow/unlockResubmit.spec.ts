import * as path from 'path'

describe('dashboard', () => {
    it('can unlock and resubmit', () => {
        cy.logInAsStateUser()

        // fill out an entire submission
        cy.startNewContractOnlySubmission()
        cy.fillOutBaseContractDetails()
        cy.findByTestId('unlockedBanner').should('not.exist')
        cy.navigateForm('CONTINUE')
        cy.fillOutStateContact()
        cy.navigateForm('CONTINUE')
        cy.findByRole('heading', {name: /Supporting documents/}).should('exist')
        cy.navigateForm('CONTINUE')
        cy.findByRole('heading', {name: /Review and submit/}).should('exist')

        // Store submission url for reference later
        cy.location().then( (fullUrl) => {
            const reviewURL = fullUrl.toString()
            const submissionURL = reviewURL.replace('/review-and-submit', '')
            fullUrl.pathname = path.dirname(fullUrl)

            // Submit, sent to dashboard
            cy.submitStateSubmissionForm()

            cy.findByText('Dashboard').should('exist')
            cy.findByText('Programs').should('exist')

            // Login as CMS User
            cy.findByRole('button', { name: 'Sign out' }).click()
            cy.findByText(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )
            cy.logInAsCMSUser({ initialURL: submissionURL })

            // click on the unlock button, type in reason and confirm
            cy.wait(2000)
            cy.findByRole('button', { name: 'Unlock submission' }).click()
            cy.findByTestId('modalWindow')
                .should('be.visible')
            cy.get("#unlockReasonCharacterCount").type('Unlock submission reason.')
            cy.findByRole('button', { name: 'Submit' }).click()

            cy.wait(2000)

            cy.findByRole('button', { name: 'Unlock submission' })
                .should('be.disabled')
            cy.findByTestId('modalWindow')
                .should('be.hidden')

            //Unlock banner for CMS user to be present with correct data.
            cy.findByTestId('unlockedBanner')
                .should('exist')
                .and('contain.text', 'zuko@example.com')
                .and('contain.text', 'Unlock submission reason.')
                .contains(/Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+\s[a-zA-Z]+/i)
                .should('exist')

            cy.wait(2000)

            //Find unlocked submission name
            cy.get('#submissionName').then(($h2) => {
                //Set name to variable for later use in finding the unlocked submission
                const submissionName = $h2.text()
                // Login as state user
                cy.findByRole('button', { name: 'Sign out' }).click()

                cy.findByText(
                    'Medicaid and CHIP Managed Care Reporting and Review System'
                )

                cy.logInAsStateUser()

                // State user sees unlocked submission - check tag then submission link
                cy.findByText('Dashboard').should('exist')
                cy.get('table')
                    .should('exist')
                    .findByText(submissionName)
                    .parent()
                    .siblings('[data-testid="submission-status"]')
                    .should('have.text', 'Unlocked')

                cy.get('table')
                    .should('exist')
                    .findByText(submissionName)
                    .should('have.attr', 'href')
                    .and('include', 'review-and-submit')

                cy.visit(reviewURL)

                // State user can resubmit and see resubmitted package in dashboard
                cy.wait('@fetchSubmission2Query')

                //Unlock banner for state user to be present with correct data.
                 cy.findByRole('heading', {level: 2, name: /Review and submit/})
                 cy.findByRole('heading', {
                     name: `Minnesota ${submissionName}`,
                 }).should('exist')
                cy.findByTestId('unlockedBanner')
                    .should('exist')
                    .and('contain.text', 'zuko@example.com')
                    .and('contain.text', 'Unlock submission reason.')
                    .contains(
                        /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+\s[a-zA-Z]+/i
                    )
                    .should('exist')

                cy.submitStateSubmissionForm(true, true)

                cy.findByText('Dashboard').should('exist')

                cy.get('table')
                    .should('exist')
                    .findByText(submissionName)
                    .parent()
                    .siblings('[data-testid="submission-status"]')
                    .should('have.text', 'Submitted')

                cy.get('table')
                    .findByText(submissionName)
                    .should('have.attr', 'href')
                    .and('not.include', 'review-and-submit')

                // Login as CMS User
                cy.findByRole('button', { name: 'Sign out' }).click()
                cy.findByText(
                    'Medicaid and CHIP Managed Care Reporting and Review System'
                )
                cy.logInAsCMSUser({ initialURL: submissionURL })

                //  CMS user sees resubmitted submission and active unlock button
                cy.findByRole('button', { name: 'Unlock submission' }).should(
                    'not.be.disabled'
                )

                cy.findByTestId('unlockedBanner').should('not.exist')
            })
        })
    })
})
