describe('rate details', () => {
    it('can navigate to and from rate details page', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to rate details page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/rate-details`)

            // Navigate to contract details page by clicking back for a contract only submission
            cy.findByRole('link', { name: /Back/ }).click()
            cy.findByRole('heading', { level: 2, name: /Contract details/ })

            // Navigate to rate details page
            cy.visit(`/submissions/${draftSubmissionId}/rate-details`)

            // Navigate to dashboard page by clicking save as draft
            cy.findByRole('button', { name: /Save as draft/ }).click()
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // Navigate to rate details page
            cy.visit(`/submissions/${draftSubmissionId}/rate-details`)

            cy.fillOutNewRateCertification()

            // Navigate to contacts page by clicking continue
            cy.navigateForm('Continue')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
        })
    })

    it('can add ammendment to prior rate certification', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to rate details page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/rate-details`)

            cy.fillOutNewRateCertification()
            cy.fillOutAmendmentToPriorRateCertification()

            // Navigate to contacts page by clicking continue
            cy.navigateForm('Continue')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
        })
    })
})
