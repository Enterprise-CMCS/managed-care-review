describe('contract details', () => {
    it('can navigate to and from contract details page', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()

        // Obtain draft submission id
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]

            // CONTINUE for contract only submission goes to Contacts page
            cy.fillOutBaseContractDetails()
            cy.navigateForm('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })

            // BACK to contract details, switch some fields, and SAVE AS DRAFT
            cy.navigateForm('BACK')
            cy.findByLabelText(/Prepaid Inpatient Health Plan/).safeClick()
            cy.findByLabelText(
                /Primary Care Case Management Entity/
            ).safeClick()
            cy.navigateForm('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // Navigate to submission type page, switch to contract and rates submission
            cy.visit(`/submissions/${draftSubmissionId}/type`)
            cy.findByText('Contract action and rate certification').click()
            cy.navigateForm('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contract details/ })
            // this prevents flakes- watch for step indicator to update to show rerenders after update call are complete
            cy.findByTestId('step-indicator').contains('span', 'Rate details')

            // CONTINUE for contract and rates submission goes to Rate details page
            cy.navigateForm('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Rate details/ })
        })
    })

    it('can add amendment to prior base contract', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()

        cy.fillOutAmendmentToBaseContractDetails()
        cy.navigateForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Contacts/ })

        // check accessibility of filled out contract details page
        cy.navigateForm('BACK')
        cy.pa11y({
            actions: ['wait for element #form-guidance to be visible'],
            hideElements: '.usa-step-indicator',
            threshold: 6,
        })
    })
})
