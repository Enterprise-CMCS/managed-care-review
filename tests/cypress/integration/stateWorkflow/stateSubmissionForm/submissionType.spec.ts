describe('submission type', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
    })
    it('can navigate to and from type page', () => {
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
            cy.wait('@fetchHealthPlanPackageQuery', { timeout: 50000 })
            cy.findByRole('heading', {
                level: 2,
                name: /Submission type/,
                timeout: 10000,
            })
            cy.wait(500) // WEIRD flake here where we click the cancel button but the page doesn't navigate back

            // Navigate to dashboard page by clicking cancel
            cy.findByRole('button', { name: /Cancel/ }).click()
            cy.wait('@indexHealthPlanPackagesQuery', { timeout: 50000 })
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // Navigate to type page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )
            cy.wait('@fetchHealthPlanPackageQuery', { timeout: 50000 })

            // Navigate to dashboard page by clicking save as draft
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // Navigate to back to submission type page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )
            cy.wait('@fetchHealthPlanPackageQuery', { timeout: 50000 })

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
            cy.wait('@fetchHealthPlanPackageQuery', { timeout: 50000 })

            cy.findByText('Contract action and rate certification').click()

            // Navigate to contract details page by clicking continue for contract and rates submission
            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contract details/ })

            // Navigate to type page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )
            cy.wait('@fetchHealthPlanPackageQuery', { timeout: 50000 })

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
            cy.wait('@fetchHealthPlanPackageQuery', { timeout: 50000 })
            cy.findByRole('heading', {
                level: 2,
                name: /Submission type/,
                timeout: 10000,
            })
            cy.wait(500) // WEIRD flake here where we click the cancel button but the page doesn't navigate back

            // Navigate to dashboard page by clicking cancel
            cy.findByRole('button', { name: /Cancel/ }).click()
            cy.wait('@indexHealthPlanPackagesQuery', { timeout: 50000 })
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // Navigate to type page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )
            cy.wait('@fetchHealthPlanPackageQuery', { timeout: 50000 })

            //Edit some stuff here
            cy.findByRole('combobox', {
                name: 'Programs this contract action covers (required)',
            }).click()
            cy.findByText('SNBC').click({ force: true })
            cy.findByText('Contract action and rate certification').click()
            cy.findByRole('textbox', { name: 'Submission description' }).clear()
            cy.findByRole('textbox', { name: 'Submission description' }).type(
                'description of contract only submission, now with a new edited flavor'
            )

            // Click Save as draft button to save changes and navigate to dashboard
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // Navigate back to submission type page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/type`
            )
            cy.wait('@fetchHealthPlanPackageQuery', { timeout: 50000 })

            //Check to make sure edited stuff was saved
            cy.get('[aria-label="Remove PMAP"]').should('exist')
            cy.get('[aria-label="Remove SNBC"]').should('exist')
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
