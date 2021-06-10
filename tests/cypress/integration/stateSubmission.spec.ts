describe('State Submission', () => {
    describe('submission type form', () => {
        it('user encounters Not Found message when navigating to non-existent submission', () => {
            cy.login()
            cy.visit('/submissions/not-a-draft-submission/type')
            cy.findByText('404 / Page not found').should('exist')
            cy.findByText('Dashboard').not('exist')
        })

        it('user can start a new submission and continue with valid input', () => {
            cy.login()
            cy.findByTestId('dashboardPage').should('exist')
            cy.findByRole('link', { name: 'Start new submission' }).click({
                force: true,
            })
            cy.location('pathname').should('eq', '/submissions/new')
            cy.findByText('New submission').should('exist')

            // Fill out some submission type fields but not all
            cy.findByLabelText('Contract action only').safeClick()
            cy.findByRole('combobox', { name: 'Program' }).select('msho')

            // Continue button triggers submission type validation
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()
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
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()

            // Fill out some base contract fields
            cy.findByText('Contract details').should('exist')
            cy.findByText(/MN-MSHO-/).should('exist')
            cy.findByLabelText('Base contract').safeClick()
            cy.findByLabelText('Start date').type('04/01/2024')
            cy.findByLabelText('End date').type('04/01/2026')
            cy.findByLabelText('Managed Care Organization (MCO)').safeClick()
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()

            // Continue button triggers contract details validation
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()
            cy.findByText('You must select at least one authority').should(
                'exist'
            )
            cy.findAllByTestId('errorMessage').should('have.length', 1)

            // Fill out missing required fields for contract details
            cy.findByLabelText('1932(a) State Plan Authority').safeClick()
            cy.findAllByTestId('errorMessage').should('have.length', 0)
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()

            // Skip rate details
            cy.findByText('Rate details').should('exist')
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()

            // Continue button navigates to documents page
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()
            cy.findByRole('heading', { name: 'Documents' }).should('exist')
            cy.findByText(/MN-MSHO-/).should('exist')

            // Continue button, without filling out form, triggers validation
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()
            cy.findByText('Missing documents').should('exist')
            cy.findByText('You must upload at least one document').should(
                'exist'
            )

            // Add multiple documents, show loading indicators
            cy.findByTestId('file-input-input').attachFile([
                'documents/how-to-open-source.pdf',
                'documents/testing.docx',
                'documents/testing.csv',
            ])
            cy.findAllByTestId('file-input-preview-image').should(
                'have.class',
                'is-loading'
            )
            cy.findByTestId('file-input-preview-list')
                .findAllByRole('listitem')
                .should('have.length', 3)
            cy.findAllByTestId('file-input-preview-image').should(
                'not.have.class',
                'is-loading'
            )

            // No errors
            cy.findByText('Upload failed').should('not.exist')
            cy.findByText('Duplicate file').should('not.exist')

            // Show duplicate document error for last item in list when expected
            cy.findByTestId('file-input-input').attachFile(
                'documents/how-to-open-source.pdf'
            )
            cy.findByTestId('file-input-preview-list')
                .findAllByRole('listitem')
                .should('have.length', 4)
            cy.findAllByText('how-to-open-source.pdf').should('have.length', 2)
            cy.findByTestId('file-input-preview-list')
                .findAllByRole('listitem')
                .last()
                .findAllByText('Duplicate file')
                .should('exist')
            cy.findAllByText('Duplicate file').should('have.length', 1)

            // Remove duplicate document and remove error
            cy.findAllByText('Remove').should('exist').first().safeClick()
            cy.findByTestId('file-input-preview-list')
                .findAllByRole('listitem')
                .should('have.length', 3)
            cy.findAllByText('how-to-open-source.pdf').should('have.length', 1)
            cy.findAllByText('Duplicate file').should('not.exist')

            // Continue button with valid documents navigates to review and submit page
            cy.findAllByTestId('file-input-preview-image').should(
                'not.have.class',
                'is-loading'
            )
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()
            cy.findByRole('button', { name: 'Continue' }).should('exist')
            cy.url({ timeout: 10_000 }).should('match', /.*review-and-submit$/)
        })

        it('user can edit a draft contract only submission', () => {
            cy.login()

            // Add a new contract only submission
            cy.findByRole('link', { name: 'Start new submission' }).click({
                force: true,
            })
            cy.findByLabelText(
                'Contract action and rate certification'
            ).safeClick()
            cy.findByRole('textbox', { name: 'Submission description' })
                .should('exist')
                .type('description of submission')
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()

            // Fill out contract details
            cy.findByText('Contract details').should('exist')
            cy.findByText(/MN-MSHO-/).should('exist')
            cy.findByLabelText('Base contract').safeClick()
            cy.findByLabelText('Start date').type('04/01/2024')
            cy.findByLabelText('End date').type('04/01/2026')
            cy.findByLabelText('Managed Care Organization (MCO)').safeClick()
            cy.findByLabelText('1932(a) State Plan Authority').safeClick()
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()

            //Skip rate details
            cy.findByText('Rate details').should('exist')
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()

            // Add documents
            cy.findByRole('heading', { name: 'Documents' }).should('exist')
            cy.findByTestId('documents-hint').should(
                'contain.text',
                'Must include: an executed contract and a signed rate certification'
            )
            cy.findByTestId('file-input-input').attachFile(
                'documents/trussel-guide.pdf'
            )
            cy.findByText('Upload failed').should('not.exist')
            cy.findByText('Duplicate file').should('not.exist')

            // Continue button with valid documents navigates to review and submit page
            cy.findAllByTestId('file-input-preview-image').should(
                'not.have.class',
                'is-loading'
            )
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()

            // Get draft submission id and navigate back to submission type form to edit existing draft
            cy.location().then((fullUrl) => {
                const { pathname } = fullUrl
                const pathnameArray = pathname.split('/')
                const draftSubmissionId = pathnameArray[2]
                cy.visit(`/submissions/${draftSubmissionId}/type`)
            })

            // Change type to contract and rates submission
            cy.findByLabelText('Contract action and rate certification').should(
                'be.checked'
            )
            cy.findByRole('textbox', { name: 'Submission description' }).should(
                'have.value',
                'description of submission'
            )
            cy.findByLabelText('Contract action only').safeClick()
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()

            // Change contract dates
            cy.findByText('Contract details').should('exist')
            cy.findByText(/MN-MSHO-/).should('exist')
            cy.findByLabelText('Base contract').should('be.checked')
            cy.findByLabelText('Start date').clear()
            cy.findByLabelText('Start date').type('04/15/2024')
            cy.findByLabelText('End date').clear()
            cy.findByLabelText('End date').type('04/15/2026')
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()

            // Skip rate details
            cy.findByText('Rate details').should('exist')
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()

            // Check that documents loads with correct data
            cy.findByRole('heading', { name: 'Documents' }).should('exist')
            cy.findByTestId('documents-hint').should(
                'contain.text',
                'Must include: an executed contract'
            )
            cy.findByText('trussel-guide.pdf').should('exist')
        })

        it('user can edit a draft contract and rates submission', () => {
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
            }).safeClick()
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
