describe('submission type', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    it('can navigate back and save as draft from submission type page', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmissionWithBaseContract()

        // Navigate to type page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )
            cy.findByRole('heading', {
                level: 2,
                name: /Submission type/,
                timeout: 10_000,
            })

            // Navigate to dashboard page by clicking cancel
            cy.findByRole('button', { name: /Cancel/, timeout: 5_000}).click()
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // Navigate to type page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )

             //Edit some stuff here
             cy.findByRole('combobox', {
                name: 'Programs this contract action covers (required)',
            }).click()
            cy.findByText('SNBC').click({ force: true })
            cy.findByRole('textbox', { name: 'Submission description' }).clear()
            cy.findByRole('textbox', { name: 'Submission description' }).type(
                'description of contract only submission, now with a new edited flavor'
            )

            // Navigate to dashboard page by clicking save as draft
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })
        })
    })

    it('can switch submission from contract action only to contract action and rate certification', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmissionWithBaseContract()

        // Navigate to type page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )

            cy.findByText('Contract action and rate certification').click()

            // Navigate to contract details page by clicking continue for contract and rates submission
            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contract details/ })

            // Navigate to type page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )

            cy.findByLabelText('Contract action and rate certification').should(
                'be.checked'
            )
        })
    })
})
