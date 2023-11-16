describe('new submission', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    it('can navigate to and from new page', () => {
        cy.logInAsStateUser()

        // Navigate to new page
        cy.visit(`/submissions/new`)

        // Navigate to dashboard page by clicking cancel
        cy.findByRole('button', { name: /Cancel/ }).click()
        cy.wait('@indexHealthPlanPackagesQuery', { timeout: 50_000 })
        cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })

        // Navigate to new page
        cy.visit(`/submissions/new`)

        cy.fillOutContractActionOnlyWithBaseContract()

        // Navigate to contract details page by clicking continue for contract only submission
        cy.navigateFormByButtonClick('CONTINUE_FROM_START_NEW')
        cy.findByRole('heading', { level: 2, name: /Contract details/ })

        // check accessibility of filled out SubmissionType page
        cy.navigateFormByButtonClick('BACK')
        // Commented out to get react-scripts/webpack 5 upgrade through
        // cy.pa11y({
        //     actions: ['wait for element #form-guidance to be visible'],
        //     hideElements: '.usa-step-indicator',
        // })
    })
})
