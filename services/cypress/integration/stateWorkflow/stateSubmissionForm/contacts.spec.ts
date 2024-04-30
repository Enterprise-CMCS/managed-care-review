describe('contacts', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    it('can navigate back and save as draft from contacts page with contract only submission', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmissionWithBaseContract()

        // Navigate to contacts page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]

            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/contacts`
            )

            // On contacts page, navigate BACK
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Contract details/ })

            // On contacts page, SAVE_DRAFT
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/contacts`
            )

            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.fillOutStateContact()
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })
        })
    })
    it('can navigate back and save as draft from contacts page with contract and rates submission', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to contacts page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/contacts`
            )

            // On contacts page, navigate BACK
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Rate details/ })
            cy.fillOutNewRateCertification()
            cy.findByRole('radiogroup', {
                name: /Actuaries' communication preference/
            })
                .should('exist')
                .within(() => { 
                    cy.findByText("OACT can communicate directly with the state's actuaries but should copy the state on all written communication and all appointments for verbal discussions.")
                    .click()
                })
            cy.navigateFormByButtonClick('CONTINUE')

            // On contacts page, SAVE_DRAFT
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.fillOutStateContact()
        })
    })

})
