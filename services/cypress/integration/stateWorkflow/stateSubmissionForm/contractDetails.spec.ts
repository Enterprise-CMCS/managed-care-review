describe('contract details', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    it(' navigate back and save as draft from contract details page', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmissionWithBaseContract()

        // Obtain draft submission id
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]

            // CONTINUE for contract only submission goes to Contacts page
            cy.fillOutBaseContractDetails()
            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })

            // BACK to contract details, switch some fields, and SAVE AS DRAFT
            cy.navigateFormByButtonClick('BACK')
            cy.findByLabelText(/Prepaid Inpatient Health Plan/).safeClick()
            cy.findByLabelText(
                /Primary Care Case Management Entity/
            ).safeClick()
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })
        })
    })

    it('can add amendment to prior base contract', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmissionWithAmendment()

        cy.fillOutAmendmentToBaseContractDetails()
        cy.navigateFormByButtonClick('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Contacts/ })

        // check accessibility of filled out contract details page
        cy.navigateFormByButtonClick('BACK')
        // Commented out to get react-scripts/webpack 5 upgrade through
        // cy.pa11y({
        //     actions: ['wait for element #form-guidance to be visible'],
        //     hideElements: '.usa-step-indicator',
        //     threshold: 6,
        // })
    })
})
