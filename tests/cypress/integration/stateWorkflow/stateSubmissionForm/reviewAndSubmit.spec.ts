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
        })
        cy.findByRole('heading', { level: 2, name: /Review and submit/ })

        // Navigate to documents page by clicking back link
        cy.findByRole('link', { name: /Back/ }).click()
        cy.findByRole('heading', { level: 2, name: /Documents/ })

        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/review-and-submit`)
        })
        cy.findByRole('heading', { level: 2, name: /Review and submit/ })

        // Navigate to dashboard page by clicking save as draft
        cy.findByRole('link', { name: /Save as draft/ }).click()
        cy.findByRole('heading', { level: 1, name: /Dashboard/ })
    })

    it('can not submit an incomplete submission', () => {
        cy.logInAsStateUser()

        cy.startNewContractAndRatesSubmission()

        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/review-and-submit`)
        })
        cy.findByRole('heading', { level: 2, name: /Review and submit/ })

        cy.submitStateSubmissionForm()
        cy.findByRole('heading', { level: 3, name: /Submission Error/ })
    })
})
