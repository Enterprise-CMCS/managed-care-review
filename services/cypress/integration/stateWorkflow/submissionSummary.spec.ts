describe('State user can view submissions', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })

    it('and view a specific summary page from the dashboard', () => {
        cy.logInAsStateUser()

        // add a draft contract only submission
        cy.startNewContractOnlySubmissionWithBaseContract()
        cy.navigateContractForm('SAVE_DRAFT')

        // navigate back to dashboard
        cy.navigateToDashboard()

        // add a submitted contract and rates submission
        cy.startNewContractAndRatesSubmission()

        cy.fillOutBaseContractDetails()
        cy.navigateContractForm('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Rate details/,
        }).should('exist')
        cy.fillOutNewRateCertification()
        cy.fillOutAdditionalActuaryContact()
        cy.findByRole('radiogroup', {
            name: /Actuaries' communication preference/,
        })
            .should('exist')
            .within(() => {
                cy.findByText(
                    "OACT can communicate directly with the state's actuaries but should copy the state on all written communication and all appointments for verbal discussions."
                ).click()
            })
        cy.navigateContractRatesForm('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Attestations/,
        }).should('exist')
        cy.fillOutAttestations()
        cy.navigateContractForm('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Contacts/,
        }).should('exist')
        cy.fillOutStateContact()
        cy.navigateContractForm('CONTINUE')

        // Store submission name for reference later
        let submissionId = ''
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            submissionId = pathnameArray[3]
        })

        cy.findByRole('heading', { level: 2, name: /Review and submit/ })

        // Submit, sent to submission summary
        cy.submitStateSubmissionForm()

        // View submission summary
        cy.findByTestId('submission-id').then(($el) => {
            const submissionName = $el
                .text()
                .replace(/^Submission ID\s*\|\s*/, '')
                .trim()

            cy.url({ timeout: 10_000 }).should('contain', submissionId)
            cy.findByTestId('submission-summary').should('exist')
            cy.findByRole('heading', {
                name: new RegExp(`Minnesota Submission ID | ${submissionName}`),
            }).should('exist')
            cy.findAllByText('Submitted').should('exist')
            cy.findByText('Rate details').should('exist')
            cy.findByText('New rate certification').should('exist')
            cy.findByText('02/29/2024 to 02/28/2025').should('exist')
            cy.findByText(/Download contract documents/i, {
                timeout: 20000,
            }).should('exist')
            cy.findByRole('table', {
                name: 'Contract',
            }).should('exist')

            cy.findByRole('table', {
                name: 'Contract supporting documents',
            }).should('exist')
            cy.findByRole('table', {
                name: 'Rate certification',
            }).should('exist')

            cy.findByRole('table', {
                name: 'Rate supporting documents',
            }).should('exist')

            // Double check we do not show any missing field text. This UI is not used for submitted packages
            cy.findByText(/You must provide this information/).should(
                'not.exist'
            )

            // Link back to dashboard, submission visible in default program
            cy.findByText('Go to state dashboard').should('exist').click()
            cy.findByText('Dashboard').should('exist')
            // check the table of submissions--find a draft row, then the link in the ID column
            cy.get('table')
                .contains('span', 'Draft')
                .eq(0)
                .parents('tr')
                .findByTestId('submission-id')
                .find('a')
                .should('have.attr', 'href')
                // draft submission URL is /submissions/${submission.contractSubmissionType}/${submission.id}/type
                .and('include', 'type')
            cy.get('table')
                .contains('span', 'Submitted')
                .eq(0)
                .parents('tr')
                .findByTestId('submission-id')
                .find('a')
                .should('have.attr', 'href')
                .and('include', 'submissions')
                // submitted submission URL is /submissions/${submission.contractSubmissionType}/${submission.id}
                .and('not.include', 'type')
            cy.get('table')
                .contains('span', 'Draft')
                .eq(0)
                .parents('tr')
                .findByTestId('submission-date')
                .should('be.empty')
            cy.get('table')
                .contains('span', 'Submitted')
                .eq(0)
                .parents('tr')
                .findByTestId('submission-date')
                .should('not.be.empty')
            /* the submission ID should contain 'MCR-', which is the prefix for all submissions
                as well as the names of the programs (we only check for one program name here) */
            cy.get('table')
                .contains('span', 'Draft')
                .eq(0)
                .parents('tr')
                .findByTestId('program-tag')
                .eq(0)
                .invoke('text')
                .then((text) => {
                    cy.get('table')
                        .contains('span', 'Draft')
                        .eq(0)
                        .parents('tr')
                        .findByTestId('submission-id')
                        .invoke('text')
                        .then((submissionId) => {
                            expect(submissionId).to.contain(text.toUpperCase())
                            expect(submissionId).to.contain('MCR-')
                        })
                })
        })
    })
})
