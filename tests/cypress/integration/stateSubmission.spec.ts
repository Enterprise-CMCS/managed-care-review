describe('State Submission', () => {
    describe('submission type form', () => {
        it('user encounters Not Found message when navigating to non-existent submission', () => {
            cy.login()
            cy.visit('/submissions/not-a-draft-submission/type')
            cy.findByText('404 / Page not found').should('exist')
            cy.findByText('Dashboard').not('exist')
        })

        it('user can start a new contract and rates submission and continue with valid input', () => {
            cy.login()
            cy.findByTestId('dashboardPage').should('exist')
            cy.findByRole('link', { name: 'Start new submission' }).click({
                force: true,
            })
            cy.location('pathname').should('eq', '/submissions/new')
            cy.findByText('New submission').should('exist')

            // Fill out some submission type fields but not all
            cy.findByLabelText(
                'Contract action and rate certification'
            ).safeClick()
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

            // Check Step Indicator loads with Contract Details heading
            cy.findByTestId('step-indicator')
                .findAllByText('Contract Details')
                .should('have.length', 2)

            // Fill out some base contract fields
            cy.findByText(/MN-MSHO-/).should('exist')
            cy.findByLabelText('Base contract').safeClick()
            cy.findByLabelText('Start date').type('04/01/2024')
            cy.findByLabelText('End date').type('03/31/2025')
            cy.findByLabelText('Managed Care Organization (MCO)').safeClick()

            // Continue button triggers contract details validation
            cy.navigateForm('Continue')
            cy.findByText('You must select at least one authority').should(
                'exist'
            )
            cy.findAllByTestId('errorMessage').should('have.length', 1)

            // Fill out missing required fields for contract details
            cy.findByLabelText('1932(a) State Plan Authority').safeClick()
            cy.findAllByTestId('errorMessage').should('have.length', 0)
            cy.navigateForm('Continue')

            cy.findByText(/MN-MSHO-/).should('exist')

            // Fill out some new rate details
            cy.findByLabelText('New rate certification').safeClick()

            cy.findByTestId('step-indicator')
                .findAllByText('Rate Details')
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

            // Continue button navigates to documents page
            cy.navigateForm('Continue')

            cy.findByText(/MN-MSHO-/).should('exist')
            cy.findByTestId('file-input-input').should('exist')

            cy.findByTestId('step-indicator')
                .findAllByText('Documents')
                .should('have.length', 2)

            cy.navigateForm('Continue')

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
                            const submissionCard = submittedText
                                .parent()
                                .parent()
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
            cy.login()
            cy.findByTestId('dashboardPage').should('exist')
            cy.findByRole('link', { name: 'Start new submission' }).click({
                force: true,
            })
            cy.location('pathname').should('eq', '/submissions/new')
            cy.findByText('New submission').should('exist')

            cy.findByLabelText('Contract action only').safeClick()
            cy.findByRole('combobox', { name: 'Program' }).select('msho')

            cy.findByRole('textbox', { name: 'Submission description' })
                .should('exist')
                .type('description of submission')

            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()

            // This will break eventually, but is fixing a weird bug in CI where the heading hasn't been
            // updated with the Submission.name even though we can see 'Contract details'
            cy.findByText(/^MN-MSHO-/).should('exist')

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

        it('user can switch a draft contract only submission to be a draft contract and rates certification submission', () => {
            cy.login()

            // Add a new contract only submission
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

            // Check Step Indicator loads with Contract Details heading
            cy.findByTestId('step-indicator')
                .findAllByText('Contract Details')
                .should('have.length', 2)

            // Fill out contract details
            cy.findByText(/MN-MSHO-/).should('exist')
            cy.findByLabelText('Base contract').safeClick()
            cy.findByLabelText('Start date').type('04/01/2024')
            cy.findByLabelText('End date').type('03/31/2025').blur()
            cy.findByLabelText('Managed Care Organization (MCO)').safeClick()
            cy.findByLabelText('1932(a) State Plan Authority').safeClick()
            cy.findAllByTestId('errorMessage').should('have.length', 0)

            cy.navigateForm('Continue')

            // Add documents
            cy.findByRole('progressbar', { name: 'Loading' }).should(
                'not.exist'
            )

            cy.findByTestId('documents-hint').should(
                'contain.text',
                'Must include: An executed contract'
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
            cy.navigateForm('Continue')

            // Get draft submission id and navigate back to submission type form to edit existing draft
            cy.location().then((fullUrl) => {
                const { pathname } = fullUrl
                const pathnameArray = pathname.split('/')
                const draftSubmissionId = pathnameArray[2]
                cy.visit(`/submissions/${draftSubmissionId}/type`)
            })

            // Change type to contract and rates submission
            cy.findByLabelText('Contract action only').should('be.checked')
            cy.findByRole('textbox', { name: 'Submission description' }).should(
                'have.value',
                'description of submission'
            )
            cy.findByLabelText(
                'Contract action and rate certification'
            ).safeClick()
            cy.navigateForm('Continue')

            // Change contract dates
            cy.findByTestId('step-indicator')
                .findAllByText('Contract Details')
                .should('have.length', 2)

            cy.findByText(/MN-MSHO-/).should('exist')
            cy.findByLabelText('Base contract').should('be.checked')
            cy.findByLabelText('Start date').clear()
            cy.findByLabelText('Start date').type('04/15/2024')
            cy.findByLabelText('End date').clear()
            cy.findByLabelText('End date').type('04/15/2026')
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()

            //Change rate details
            cy.findByLabelText('New rate certification').safeClick()
            cy.findByLabelText('Start date').clear()
            cy.findByLabelText('Start date').type('04/01/2024')
            cy.findByLabelText('End date').clear()
            cy.findByLabelText('End date').type('03/31/2025')
            cy.findByLabelText('Date certified').clear()
            cy.findByLabelText('Date certified').type('03/01/2024')
            cy.navigateForm('Continue')

            // Check that documents loads with correct data
            cy.findByTestId('documents-hint').should(
                'contain.text',
                'Must include: An executed contract'
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

            // Shows step indicator
            cy.findByTestId('step-indicator').should('exist')

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

        it('user can a rates amendment', () => {
            cy.login()

            // Add a new submission
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
            cy.findByTestId('step-indicator')
                .findAllByText('Contract Details')
                .should('have.length', 2)

            cy.findByLabelText('Amendment to base contract').safeClick()
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()
            cy.findByLabelText('Start date').type('03/01/2024')
            cy.findByLabelText('End date').type('03/31/2026')
            cy.findByLabelText('Managed Care Organization (MCO)').safeClick()
            cy.findByLabelText('1932(a) State Plan Authority').safeClick()
            cy.findByLabelText('Capitation rates').safeClick()
            cy.findByLabelText('Annual rate update').safeClick()
            cy.findByLabelText('No').safeClick()
            cy.findAllByTestId('errorMessage').should('have.length', 0)
            cy.navigateForm('Continue')

            //Fill out rate details
            cy.findByLabelText('New rate certification').safeClick()
            cy.findByTestId('step-indicator')
                .findAllByText('Rate Details')
                .should('have.length', 2)
            cy.findByLabelText('Start date').type('04/01/2024')
            cy.findByLabelText('End date').type('04/01/2026')
            cy.findByLabelText('Date certified').type('03/01/2024')
            cy.navigateForm('Continue')

            // Navigate back to contract details
            cy.location().then((fullUrl) => {
                const { pathname } = fullUrl
                const pathnameArray = pathname.split('/')
                const draftSubmissionId = pathnameArray[2]
                cy.visit(`/submissions/${draftSubmissionId}/contract-details`)
            })

            // Check that contract details form loads with correct data
            cy.findByLabelText('Amendment to base contract').should(
                'be.checked'
            )
            cy.findByLabelText('Start date').should('have.value', '03/01/2024')
            cy.findByLabelText('End date').should('have.value', '03/31/2026')
            cy.findByLabelText('Managed Care Organization (MCO)').should(
                'be.checked'
            )
            cy.findByLabelText('1932(a) State Plan Authority').should(
                'be.checked'
            )
            cy.findByLabelText('Capitation rates').should('be.checked')
            cy.findByLabelText('Annual rate update').should('be.checked')
        })

        it('user can complete a contract submission and see submission summary', () => {
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

            // Check Step Indicator loads with Contract Details heading
            cy.findByTestId('step-indicator')
                .findAllByText('Contract Details')
                .should('have.length', 2)

            // Fill out contract details
            cy.findByText(/MN-MSHO-/).should('exist')
            cy.findByLabelText('Base contract').safeClick()
            cy.findByLabelText('Start date').type('04/01/2024')
            cy.findByLabelText('End date').type('03/31/2025').blur()
            cy.findByLabelText('Managed Care Organization (MCO)').safeClick()
            cy.findByLabelText('1932(a) State Plan Authority').safeClick()
            cy.findAllByTestId('errorMessage').should('have.length', 0)
            cy.navigateForm('Continue')

            //Fill out rate details
            cy.findByLabelText('New rate certification').safeClick()
            cy.findByLabelText('Start date').type('02/29/2024')
            cy.findByLabelText('End date').type('02/28/2025')
            cy.findByLabelText('Date certified').type('03/01/2024')
            cy.navigateForm('Continue')

            // Add documents
            cy.findByTestId('file-input-input').attachFile(
                'documents/trussel-guide.pdf'
            )
            cy.findByText('Upload failed').should('not.exist')
            cy.findByText('Duplicate file').should('not.exist')
            cy.findAllByTestId('file-input-preview-image').should(
                'not.have.class',
                'is-loading'
            )
            // Navigate review and submit page
            cy.navigateForm('Continue')

            // Store submission name for reference later

            let submissionId = ''
            cy.location().then((fullUrl) => {
                const { pathname } = fullUrl
                const pathnameArray = pathname.split('/')
                submissionId = pathnameArray[2]
            })

            // Submit
            cy.navigateForm('Submit')
            cy.findByRole('dialog').should('exist')
            // Submit the Modal
            cy.navigateForm('Confirm submit')

            // User sent to dashboard
            cy.findByText('Dashboard').should('exist')

            cy.location().then((loc) => {
                expect(loc.search).to.match(/.*justSubmitted=*/)
                const submissionName = loc.search.split('=').pop()
                cy.findByText(`${submissionName} was sent to CMS`).should(
                    'exist'
                )
                cy.findByText(submissionName).should('exist')
                cy.findByText(submissionName).click()

                // Click submitted submission to view SubmissionSummary
                cy.findByRole('progressbar', { name: 'Loading' }).should(
                    'not.exist'
                )
                cy.findByTestId('submission-summary').should('exist')

                cy.findByRole('heading', {
                    name: `Minnesota ${submissionName}`,
                }).should('exist')
                cy.findByText('Back to state dashboard').should('exist')
                cy.url({ timeout: 10_000 }).should('contain', submissionId)
            })
        })
    })

    describe('documents page', () => {
        it('user can edit documents and save as draft', () => {
            cy.login()
            cy.startNewContractOnlySubmission()

            cy.location().then((fullUrl) => {
                const { pathname } = fullUrl
                const draftSubmissionID = pathname.split('/')[2]
                cy.visit(`/submissions/${draftSubmissionID}/documents`)

                // add valid file and save as draft
                cy.findByTestId('file-input-input').attachFile(
                    'documents/how-to-open-source.pdf'
                )
                cy.findAllByTestId('file-input-preview-image').should(
                    'not.have.class',
                    'is-loading'
                )
                cy.navigateForm('Save as draft')
                cy.findByRole('heading', { level: 1, name: /Dashboard/ })

                // go back to documents page and remove file
                cy.visit(`/submissions/${draftSubmissionID}/documents`)
                cy.findAllByText('Remove').should('exist').first().safeClick()
                cy.findAllByText('how-to-open-source.pdf').should('not.exist')

                // allow Save as Draft with no documents
                cy.navigateForm('Save as draft')
                cy.findByText('You must upload at least one document').should(
                    'not.exist'
                )
                cy.findByRole('heading', { level: 1, name: /Dashboard/ })

                // reload page,validate there are still no documents,then add duplicate documents
                cy.visit(`/submissions/${draftSubmissionID}/documents`)
                cy.findAllByText('documents/how-to-open-source.pdf').should(
                    'not.exist'
                )

                cy.findByTestId('file-input-input').attachFile(
                    'documents/trussel-guide.pdf'
                )
                cy.findAllByTestId('file-input-preview-image').should(
                    'not.have.class',
                    'is-loading'
                )
                cy.findByTestId('file-input-input').attachFile(
                    'documents/trussel-guide.pdf'
                )
                cy.findAllByTestId('file-input-preview-image').should(
                    'not.have.class',
                    'is-loading'
                )
                cy.findByText('Duplicate file').should('exist')

                // allow Save as Draft with duplicate files
                cy.navigateForm('Save as draft')
                cy.findByRole('heading', { level: 1, name: /Dashboard/ })

                // reload page, see only one file because the duplicate was discarded after Save as Draft
                cy.visit(`/submissions/${draftSubmissionID}/documents`)

                cy.findByText('Duplicate file').should('not.exist')
                cy.findByTestId('file-input-preview-list')
                    .findAllByRole('listitem')
                    .should('have.length', 1)
                cy.findAllByText('trussel-guide.pdf').should('exist')
            })
        })

        it('user can drag and drop as expected', () => {
            cy.login()
            cy.startNewContractOnlySubmission()

            // visit documents page
            cy.location().then((fullUrl) => {
                const { pathname } = fullUrl
                const draftSubmissionId = pathname.split('/')[2]
                cy.visit(`/submissions/${draftSubmissionId}/documents`)

                // Drop invalid files and invalid type message appears
                cy.findByTestId('file-input-droptarget')
                    .should('exist')
                    .attachFile(['images/trussel-guide-screenshot.png'], {
                        subjectType: 'drag-n-drop',
                        force: true,
                    })
                cy.findByTestId('file-input-error').should(
                    'have.text',
                    'This is not a valid file type.'
                )

                // Continue button shows error, no documents
                cy.navigateForm('Continue')
                cy.findByText('You must upload at least one document').should(
                    'exist'
                )

                // Drop multiple valid files
                cy.findByTestId('file-input-droptarget')
                    .should('exist')
                    .attachFile(
                        [
                            'documents/how-to-open-source.pdf',
                            'documents/testing.docx',
                        ],
                        {
                            subjectType: 'drag-n-drop',
                            force: true,
                        }
                    )
                cy.findAllByTestId('file-input-preview-image').should(
                    'have.length',
                    2
                )
                cy.findAllByTestId('file-input-preview-image').should(
                    'not.have.class',
                    'is-loading'
                )
                // Correct number of files added, no errors
                cy.findByTestId('file-input-preview-list')
                    .findAllByRole('listitem')
                    .should('have.length', 2)
                cy.findByText('Upload failed').should('not.exist')
                cy.findByText('Duplicate file').should('not.exist')

                // Drop one more valid file
                cy.findByTestId('file-input-droptarget')
                    .should('exist')
                    .attachFile(['documents/testing.csv'], {
                        subjectType: 'drag-n-drop',
                    })
                cy.findByTestId('file-input-preview-list')
                    .findAllByRole('listitem')
                    .should('have.length', 3)

                // Add one duplicate file, show one duplicate document error
                cy.findByTestId('file-input-input').attachFile(
                    ['documents/how-to-open-source.pdf'],
                    {
                        subjectType: 'drag-n-drop',
                        force: true,
                    }
                )
                cy.findByTestId('file-input-preview-list')
                    .findAllByRole('listitem')
                    .should('have.length', 4)
                cy.findAllByText('how-to-open-source.pdf').should(
                    'have.length',
                    2
                )
                cy.findAllByText('Duplicate file').should('have.length', 1)

                // Remove duplicate documents and continue with valid input
                cy.findAllByText('Remove').should('exist').first().safeClick()
                cy.findAllByText('Remove').should('exist').first().safeClick()
                cy.findByTestId('file-input-preview-list')
                    .findAllByRole('listitem')
                    .should('have.length', 2)
                cy.findAllByText('Duplicate file').should('not.exist')
            })
        })
    })
})
