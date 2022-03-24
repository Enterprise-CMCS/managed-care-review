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
            cy.navigateForm('BACK')
            cy.findByRole('heading', { level: 2, name: /Submission type/ })

            // Navigate to contract details page
            cy.visit(`/submissions/${draftSubmissionId}/contract-details`)

            // Navigate to dashboard page by clicking save as draft
           cy.navigateForm('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // Navigate to contract details page
            cy.visit(`/submissions/${draftSubmissionId}/contract-details`)

            cy.fillOutBaseContractDetails()

            // Navigate to contacts page by clicking continue for contract only submission
            cy.navigateForm('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })

            // Navigate to type page to switch to contract and rates submission
            cy.visit(`/submissions/${draftSubmissionId}/type`)
            cy.findByText('Contract action and rate certification').click()
            cy.navigateForm('CONTINUE')

            // Navigate to contract details page
            cy.visit(`/submissions/${draftSubmissionId}/contract-details`)

            // Navigate to contacts page by clicking continue for contract and rates submission
            cy.navigateForm('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Rate details/ })
        })
    })

    it('can add amendment to prior base contract', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()

        cy.fillOutAmendmentToBaseContractDetails()

        // Navigate to contacts page by clicking continue for contract only submission
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
