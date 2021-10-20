describe('submission type', () => {
    it('can navigate to and from type page', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()

        // Navigate to type page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/type`)

            // Navigate to dashboard page by clicking cancel
            cy.findByRole('link', { name: /Cancel/ }).click()
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // Navigate to type page
            cy.visit(`/submissions/${draftSubmissionId}/type`)

            // Navigate to contract details page by clicking continue for contract only submission
            cy.navigateForm('Continue')
            cy.findByRole('heading', { level: 2, name: /Contract details/ })
        })
    })

    it('can switch submission from contract action only to contract action and rate certification', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()

        // Navigate to type page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/type`)

            cy.findByText('Contract action and rate certification').click()

            // Navigate to contract details page by clicking continue for contract and rates submission
            cy.navigateForm('Continue')
            cy.findByRole('heading', { level: 2, name: /Contract details/ })

            // Navigate to type page
            cy.visit(`/submissions/${draftSubmissionId}/type`)

            cy.findByLabelText('Contract action and rate certification').should(
                'be.checked'
            )
        })
    })
})
