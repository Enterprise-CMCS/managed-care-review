describe('state user in eqro submission form', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })

    it('can navigate forward, back, and save as draft on each form page', () => {
        cy.interceptFeatureFlags({
            'eqro-submissions': true,
        })

        cy.logInAsStateUser()

        // Start new EQRO submission
        cy.startNewEQROSubmission()

        // go back to submission details and test navigation buttons
        cy.navigateContractForm('BACK')
        cy.findByRole('heading', { level: 2, name: /Submission details/ })
        cy.navigateContractForm('SAVE_DRAFT')
        cy.findByText('Draft was saved successfully.')

        // fill out contract details and fill in form
        cy.navigateContractForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Contract details/ })
        cy.fillOutEQROContractDetails()

        // continue to contacts page
        cy.navigateContractForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Contacts/ })

        // go back to contract details and save as draft
        cy.navigateContractForm('BACK')
        cy.findByRole('heading', { level: 2, name: /Contract details/ })
        cy.navigateContractForm('SAVE_DRAFT')
        cy.findByText('Draft was saved successfully.')

        // fill out contacts page
        cy.navigateContractForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Contacts/ })
        cy.fillOutStateContact()

        // continue to review and submit page
        cy.navigateContractForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Review and submit/ })

        // go back to contacts page and save as draft
        cy.navigateContractForm('BACK')
        cy.findByRole('heading', { level: 2, name: /Contacts/ })
        cy.navigateContractForm('SAVE_DRAFT')
        cy.findByText('Draft was saved successfully.')

        // continue to review submit page and submit EQRO contract
        cy.navigateContractForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Review and submit/ })

        cy.submitStateSubmissionForm({
            success: true,
            resubmission: false,
        })
    })
})
