describe('State Submission', () => {
    describe('submission type form', () => {
        it('user encounters Not Found message when navigating to non-existent submission', () => {
            cy.login()
            cy.visit('/submissions/not-a-draft-submission/type')
            cy.findByText('404 / Page not found').should('exist')
        })

        it('user can start a new submission and continue with valid input', () => {
            cy.login()
            cy.findByTestId('dashboardPage').should('exist')
            cy.findByRole('link', { name: 'Start new submission' }).click({
                force: true,
            })
            cy.location('pathname').should('eq', '/submissions/new')

            // Fill out some fields but not all
            cy.findByLabelText('Contract action only').safeClick()
            cy.findByRole('combobox', { name: 'Program' }).select('msho')

            cy.findByRole('button', {
                name: 'Continue',
            }).click()

            // Submit button triggers validation
            cy.findByText(
                'You must provide a description of any major changes or updates'
            ).should('exist')

            // Fill out missing required fields for new submission form
            cy.findByRole('textbox', { name: 'Submission description' })
                .should('exist')
                .type('description of submission')
            cy.findByText(
                'You must provide a description of any major changes or updates'
            ).should('not.exist')

            // Submit button continues to next page
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()
            cy.findByText('Contract details').should('exist')
        })

        it('user can edit a draft submission type', () => {
            cy.login()

            // Add a new submission (use default selected program)
            cy.findByRole('link', { name: 'Start new submission' }).click({
                force: true,
            })
            cy.findByLabelText('Contract action only').safeClick()
            cy.findByRole('textbox', { name: 'Submission description' })
                .should('exist')
                .type('description of submission')
            cy.findByRole('button', {
                name: 'Continue',
            }).click()
            cy.findByText('Contract details').should('exist')

            // Get draft submission id and navigate back to submission type form to edit existing draft
            cy.location().then((fullUrl) => {
                const { pathname } = fullUrl
                const pathnameArray = pathname.split('/')
                const draftSubmissionId = pathnameArray[2]
                cy.visit(`/submissions/${draftSubmissionId}/type`)
            })

            // Check that submission type form loads with correct data
            cy.findByText('404 / Page not found').should('not.exist')
            cy.findByRole('combobox', { name: 'Program' }).should(
                'have.value',
                'msho'
            )
            cy.findByLabelText('Contract action only').should('be.checked')
            cy.findByRole('textbox', { name: 'Submission description' }).should(
                'have.value',
                'description of submission'
            )
        })
    })
})
