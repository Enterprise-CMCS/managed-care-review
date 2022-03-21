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

            // Navigate to contract details page by clicking back
            cy.findByRole('button', { name: /Back/ }).click()
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

    it('can add amendment to prior rate certification', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to rate details page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/rate-details`)

            cy.fillOutAmendmentToPriorRateCertification()

            // Navigate to contacts page by clicking continue
            cy.navigateForm('Continue')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })

            // check accessibility of filled out rate details page
            cy.findByRole('button', { name: /Back/ }).click()
            cy.pa11y({
                actions: ['wait for element #form-guidance to be visible'],
                hideElements: '.usa-step-indicator',
                threshold: 4,
            })
        })
    })

    it('can get and set dates correctly', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to rate details page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/rate-details`)

            cy.fillOutAmendmentToPriorRateCertification()

            // Navigate to contacts page by clicking continue
            cy.navigateForm('Continue')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })

            
            cy.fillOutStateContact()
            cy.fillOutActuaryContact()
            cy.navigateForm('Continue')

            cy.findByRole('heading', { level: 2, name: /Supporting documents/ })

        })
    })
})
