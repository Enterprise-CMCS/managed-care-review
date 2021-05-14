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

            // Fill out some fields but not all
            cy.findByLabelText('Contract action only').safeClick()
            cy.findByRole('combobox', { name: 'Program' }).select('msho')

      
            // Continue button triggers submission type validation
            cy.findByRole('button', {
                name: 'Continue',
            }).click()
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

            // Skip contract details
            cy.findByText('Contract details').should('exist')
            cy.findByText(/MN-MSHO-/).should('exist')

             // Continue button navigates to documents page
             cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()
            cy.findByText('Documents').should('exist')
            cy.findByText(/MN-MSHO-/).should('exist')

            // Continue button, without filling out form, triggers validation
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()
            cy.findByText('Missing documents').should('exist')
            cy.findByText('You must upload at least one document').should('exist')
            
            // Add multiple documents, show loading indicators
            cy.findByTestId('file-input-input').attachFile(['documents/how-to-open-source.pdf', 'documents/testing.docx', 'documents/testing.csv']);
            cy.findAllByTestId('file-input-preview-image').should('have.class','is-loading')
            cy.findByTestId('file-input-preview-list').findAllByRole('listitem').should('have.length', 3)
            cy.findAllByTestId('file-input-preview-image').should('not.have.class','is-loading')

            // No errors
            cy.findByText('Upload failed').should('not.exist')
            cy.findByText('Duplicate file').should('not.exist')
         
  
            // Show duplicate document error for last item in list when expected
            cy.findByTestId('file-input-input').attachFile('documents/how-to-open-source.pdf');
            cy.findByTestId('file-input-preview-list').findAllByRole('listitem').should('have.length', 4)
            cy.findAllByText('how-to-open-source.pdf').should('have.length', 2)
            cy.findByTestId('file-input-preview-list').findAllByRole('listitem').last().findAllByText('Duplicate file').should('exist')
            cy.findAllByText('Duplicate file').should('have.length', 1)

            // Remove duplicate document and remove error
            cy.findAllByText('Remove').should('exist').first().safeClick()
            cy.findByTestId('file-input-preview-list').findAllByRole('listitem').should('have.length', 3)
            cy.findAllByText('how-to-open-source.pdf').should('have.length', 1)
            cy.findAllByText('Duplicate file').should('not.exist')

            // Continue button with valid documents navigates to review and submit page
            cy.findAllByTestId('file-input-preview-image').should('not.have.class','is-loading')
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()
            cy.findByRole('button', {name:'Continue'}).should('exist')
            cy.url({ timeout: 10_000 }).should('match', /.*review-and-submit$/)
    
        })

        it('user can edit to change the type of a submission type and form loads as expected', () => {
            cy.login()

            // Add a new contract only submission 
            cy.findByRole('link', { name: 'Start new submission' }).click({
                force: true,
            })
            cy.findByLabelText('Contract action and rate certification').safeClick()
            cy.findByRole('textbox', { name: 'Submission description' })
                .should('exist')
                .type('description of submission')
            cy.findByRole('button', {
                name: 'Continue',
            }).click()

            // Skip contract details
            cy.findByText('Contract details').should('exist')
            cy.findByRole('button', {
                name: 'Continue',
            }).click()

            // Add documents
            cy.findByText('Documents').should('exist')
            cy.findByTestId('documents-hint').should('contain.text',
                'Must include: an executed contract and a signed rate certification'
            )
            cy.findByTestId('file-input-input').attachFile('documents/trussel-guide.pdf');
            cy.findByText('Upload failed').should('not.exist')
            cy.findByText('Duplicate file').should('not.exist')
         
            // Continue button with valid documents navigates to review and submit page
            cy.findAllByTestId('file-input-preview-image').should('not.have.class','is-loading')
            cy.findByRole('button', {
                name: 'Continue',
            }).click()

            // Get draft submission id and navigate back to submission type form to edit existing draft
            cy.location().then((fullUrl) => {
                const { pathname } = fullUrl
                const pathnameArray = pathname.split('/')
                const draftSubmissionId = pathnameArray[2]
                cy.visit(`/submissions/${draftSubmissionId}/type`)
            })

            // Change type to contract and rates submission
            cy.findByLabelText('Contract action and rate certification').should('be.checked')
            cy.findByRole('textbox', { name: 'Submission description' }).should(
                'have.value',
                'description of submission'
            )
            cy.findByLabelText('Contract action only').safeClick()
            cy.findByRole('button', {
                name: 'Continue',
            }).click()

            // Skip contract details
            cy.findByText('Contract details').should('exist')
            cy.findByRole('button', {
                name: 'Continue',
            }).click()

             // Check that documents loads with correct data
            cy.findByText('Documents').should('exist')
            cy.findByTestId('documents-hint').should('contain.text',
                'Must include: an executed contract'
            )
            cy.findByText('trussel-guide.pdf').should('exist')
        })

          it('user can edit a draft contract and rates submission type', () => {
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
