describe('new submission', () => {
    it('can navigate to and from new page', () => {
        cy.logInAsStateUser()

        // Navigate to new page
        cy.visit(`/submissions/new`)

        // Navigate to dashboard page by clicking cancel
        cy.findByRole('button', { name: /Cancel/ }).click()
        cy.findByRole('heading', { level: 1, name: /Dashboard/ })

        // Navigate to new page
        cy.visit(`/submissions/new`)

        cy.fillOutContractActionOnly()

        // Navigate to contract details page by clicking continue for contract only submission
        cy.navigateForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Contract details/ })

        // check accessibility of filled out SubmissionType page
        cy.navigateForm('BACK')
        cy.pa11y({
            actions: ['wait for element #form-guidance to be visible'],
            hideElements: '.usa-step-indicator',
        })
    })
})
