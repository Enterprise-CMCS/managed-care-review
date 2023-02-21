describe.skip('review and submit', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
    })
    it('can navigate to and from review and submit page', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to review and submit page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/review-and-submit`
            )

            // Navigate to documents page by clicking back
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Supporting documents/ })

            // Navigate to review and submit page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/review-and-submit`
            )

            cy.findByText('Submitted').should('not.exist')
            cy.findByText('Download all contract documents').should('not.exist')

            // Navigate to dashboard page by clicking save as draft
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })
        })
    })

    it('can not submit an incomplete submission', () => {
        cy.interceptFeatureFlags({ 'rate-cert-assurance': true })
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to review and submit page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/review-and-submit`
            )

            cy.submitStateSubmissionForm(false)
            cy.findByRole('heading', { level: 4, name: /Submission error/ })
        })
    })
})
