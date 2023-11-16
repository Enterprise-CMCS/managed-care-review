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
            cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })

            // Navigate to type page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )

            // Navigate to dashboard page by clicking save as draft
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })

            // Navigate to back to submission type page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )

            // Navigate to contract details page by clicking continue for contract only submission
            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contract details/ })
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

    it('can save submission edits using Save as draft button', () => {
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
                timeout: 10000,
            })

            // Navigate to dashboard page by clicking cancel
            cy.findByRole('button', { name: /Cancel/ }).click()
            cy.wait('@indexHealthPlanPackagesQuery', { timeout: 50_000 })
            cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })

            // Navigate to type page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )

            //Edit some stuff here
            cy.findByRole('combobox', {
                name: 'Programs this contract action covers (required)',
            }).click()
            cy.findByText('SNBC').click({ force: true })

            //rate-cert-assurance
            cy.get('label[for="riskBasedContractYes"]').click()

            cy.findByRole('textbox', { name: 'Submission description' })
            cy.findByText('Contract action and rate certification').click()
            cy.findByRole('textbox', { name: 'Submission description' }).clear()
            cy.findByRole('textbox', { name: 'Submission description' }).type(
                'description of contract only submission, now with a new edited flavor'
            )

            // Click Save as draft button to save changes and navigate to dashboard
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })

            // Navigate back to submission type page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )

            //Check to make sure edited stuff was saved
            cy.get('[aria-label="Remove PMAP"]').should('exist')
            cy.get('[aria-label="Remove SNBC"]').should('exist')
            cy.findByLabelText('Contract action and rate certification').should(
                'be.checked'
            )

            //rate-cert-assurance
            cy.findByLabelText('Yes').should('be.checked')

            cy.findByRole('textbox', { name: 'Submission description' }).should(
                'have.value',
                'description of contract only submission, now with a new edited flavor'
            )
            cy.findByLabelText('Contract action and rate certification').should(
                'be.checked'
            )
        })
    })
})
