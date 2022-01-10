describe('contract details', () => {
    it('can navigate to and from contract details page', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()

        // Obtain draft submission id
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]

            // Navigate to type page by clicking back
            cy.findByRole('button', { name: /Back/ }).click()
            cy.findByRole('heading', { level: 2, name: /Submission type/ })

            // Navigate to contract details page
            cy.visit(`/submissions/${draftSubmissionId}/contract-details`)

            // Navigate to dashboard page by clicking save as draft
            cy.findByRole('button', { name: /Save as draft/ }).click()
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // Navigate to contract details page
            cy.visit(`/submissions/${draftSubmissionId}/contract-details`)

            cy.fillOutBaseContractDetails()

            // Navigate to contacts page by clicking continue for contract only submission
            cy.navigateForm('Continue')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })

            // Navigate to type page to switch to contract and rates submission
            cy.visit(`/submissions/${draftSubmissionId}/type`)
            cy.findByText('Contract action and rate certification').click()
            cy.navigateForm('Continue')

            // Navigate to contract details page
            cy.visit(`/submissions/${draftSubmissionId}/contract-details`)

            // Navigate to contacts page by clicking continue for contract and rates submission
            cy.navigateForm('Continue')
            cy.findByRole('heading', { level: 2, name: /Rate details/ })
        })
    })

    it('can add amendment to prior base contract', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()

        cy.fillOutAmendmentToBaseContractDetails()

        // Navigate to contacts page by clicking continue for contract only submission
        cy.navigateForm('Continue')
        cy.findByRole('heading', { level: 2, name: /Contacts/ })
    })
})
