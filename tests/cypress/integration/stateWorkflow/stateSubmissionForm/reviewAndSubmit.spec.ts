describe('review and submit', () => {
    it('can navigate to and from review and submit page', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to review and submit page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/review-and-submit`)

            // Navigate to documents page by clicking back
            cy.findByRole('link', { name: /Back/ }).click()
            cy.findByRole('heading', { level: 4, name: /Supporting documents/ })

            // Navigate to review and submit page
            cy.visit(`/submissions/${draftSubmissionId}/review-and-submit`)

            // Submitted and Last updated dates should not appear
            // (should only appear on Submission Summary)
            cy.findByText('Submitted').should('not.exist')
            cy.findByText('Last updated').should('not.exist')

            // Navigate to dashboard page by clicking save as draft
            cy.findByRole('link', { name: /Save as draft/ }).click()
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })
        })
    })

    it('can not submit an incomplete submission', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to review and submit page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/review-and-submit`)

            cy.submitStateSubmissionForm()
            cy.findAllByTestId('modalWindow').should('be.hidden')
            cy.findByRole('heading', { level: 4, name: /Submission Error/ })
        })
    })
})
