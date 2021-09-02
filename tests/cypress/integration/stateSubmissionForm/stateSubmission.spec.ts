describe('state submission', () => {
    it('user encounters Not Found message when navigating to non-existent submission', () => {
        cy.loginAsStateUser()
        cy.visit('/submissions/not-a-draft-submission/type')
        cy.findByText('404 / Page not found').should('exist')
        cy.findByText('Dashboard').not('exist')
    })

    it('user can start a new contract and rates submission and continue with valid input', () => {
        cy.loginAsStateUser()
        cy.findByTestId('dashboardPage').should('exist')
        cy.findByRole('link', { name: 'Start new submission' }).click({
            force: true,
        })
        cy.location('pathname').should('eq', '/submissions/new')
        cy.findByText('New submission').should('exist')

        // Check Step Indicator loads with submission type heading on new submission page
        cy.findByTestId('step-indicator')
            .findAllByText('Submission type')
            .should('have.length', 2)

        // Fill out some submission type fields but not all
        cy.findByLabelText('Contract action and rate certification').safeClick()
        cy.findByRole('combobox', { name: 'Program' }).select('msho')

        // Continue button triggers submission type validation
        cy.navigateForm('Continue')
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

        // // Check Step Indicator loads with contract details heading
        // cy.findByTestId('step-indicator')
        //     .findAllByText('Contract details')
        //     .should('have.length', 2)

        // Fill out some base contract fields
        cy.findByText(/MN-MSHO-/).should('exist')
        cy.findByLabelText('Base contract').safeClick()
        cy.findByLabelText('Start date').type('04/01/2024')
        cy.findByLabelText('End date').type('03/31/2025')
        cy.findByLabelText('Managed Care Organization (MCO)').safeClick()

        // Continue button triggers contract details validation
        cy.navigateForm('Continue')
        cy.findByText('You must select at least one authority').should('exist')
        cy.findAllByTestId('errorMessage').should('have.length', 1)

        // Fill out missing required fields for contract details
        cy.findByLabelText('1932(a) State Plan Authority').safeClick()
        cy.findAllByTestId('errorMessage').should('have.length', 0)
        cy.navigateForm('Continue')

        cy.findByText(/MN-MSHO-/).should('exist')

        // Fill out some new rate details
        cy.findByLabelText('New rate certification').safeClick()

        cy.findByTestId('step-indicator')
            .findAllByText('Rate details')
            .should('have.length', 2)

        cy.findByLabelText('Start date').type('04/01/2024')
        cy.findByLabelText('End date').type('03/30/2025')

        // Continue button triggers rate details validation
        cy.navigateForm('Continue')

        cy.findByText(
            'You must enter the date the document was certified'
        ).should('exist')
        cy.findAllByTestId('errorMessage').should('have.length', 1)

        // Fill out missing required fields for rate details
        cy.findByLabelText('Date certified').type('03/15/2024')
        cy.findAllByTestId('errorMessage').should('have.length', 0)

        // Continue button navigates to state contacts page
        cy.navigateForm('Continue')
        cy.findByText(/MN-MSHO-/).should('exist')

        // fill out state contacts
        cy.findAllByLabelText('Name').eq(0).type('Test Person')
        cy.findAllByLabelText('Title/Role').eq(0).type('Fancy Title')
        cy.findAllByLabelText('Email').eq(0).type('test@test.com')

        // add actuary contact
        cy.findAllByLabelText('Name').eq(1).type('Act Person')
        cy.findAllByLabelText('Title/Role').eq(1).type('Act Title')
        cy.findAllByLabelText('Email').eq(1).type('act@test.com')
        cy.findByLabelText('Mercer').safeClick()

        // actuary communication preference
        cy.findByLabelText(
            `OACT can communicate directly with the state’s actuary but should copy the state on all written communication and all appointments for verbal discussions.`
        ).safeClick()

        // Continue button navigates to documents page
        cy.findByRole('button', {
            name: 'Continue',
        }).safeClick()

        cy.findByText(/MN-MSHO-/).should('exist')
        cy.findByTestId('file-input-input').should('exist')

        cy.findByTestId('step-indicator')
            .findAllByText('Documents')
            .should('have.length', 2)

        cy.navigateForm('Continue')

        cy.findByText('Missing documents').should('exist')
        cy.findByText('You must upload at least one document').should('exist')

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

        cy.waitForDocumentsToLoad()

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
        cy.navigateForm('Continue')
        cy.url({ timeout: 10_000 }).should('match', /.*review-and-submit$/)

        cy.findByTestId('submission-name')
            .invoke('text')
            .then((nameText) => {
                // Submit the form and navigate to the dashboard again
                cy.navigateForm('Submit')
                cy.navigateForm('Confirm submit')
                cy.findByRole('heading', { name: 'Submissions' }).should(
                    'exist'
                )

                cy.findByText(nameText)
                    .should('exist')
                    .then((submittedText) => {
                        // find "SUBMITTED" in the card
                        const submissionCard = submittedText.parent().parent()
                        const cardStatus = submissionCard
                            .find('span[data-testid="tag"]')
                            .html()
                        assert(
                            cardStatus.indexOf('Submitted') === 0,
                            'Submission isnt displayed as Submitted'
                        )
                    })
            })
    })

    it('user can start a new submission and see it on the dashboard', () => {
        cy.loginAsStateUser()
        cy.startNewContractOnlySubmission()

        // This will break eventually, but is fixing a weird bug in CI where the heading hasn't been
        // updated with the Submission.name even though we can see 'contract details'
        cy.findByText(/^MN-PMAP-/).should('exist')

        // see that the submission appears on the dashboard
        cy.findByTestId('submission-name')
            .invoke('text')
            .then((nameText) => {
                // Navigate to the dashboard again
                cy.findByRole('link', {
                    name: 'One Mac Managed Care Review',
                }).click()
                cy.findByRole('heading', { name: 'Submissions' }).should(
                    'exist'
                )

                cy.findByText(nameText).should('exist')
            })
    })
})
