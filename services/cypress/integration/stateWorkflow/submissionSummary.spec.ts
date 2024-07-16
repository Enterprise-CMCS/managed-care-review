describe('State user can view submissions', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })

    it('and view a specific summary page from the dashboard', () => {
        cy.logInAsStateUser()

        // add a draft contract only submission
        cy.startNewContractOnlySubmissionWithBaseContract()
        cy.deprecatedNavigateV1Form('SAVE_DRAFT')

        // add a submitted contract and rates submission
        cy.startNewContractAndRatesSubmission()

        cy.fillOutBaseContractDetails()
        cy.deprecatedNavigateV1Form('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Rate details/
        }).should('exist')
        cy.fillOutNewRateCertification()
        cy.fillOutAdditionalActuaryContact()
        cy.findByRole('radiogroup', {
            name: /Actuaries' communication preference/
        })
            .should('exist')
            .within(() => {
                cy.findByText("OACT can communicate directly with the state's actuaries but should copy the state on all written communication and all appointments for verbal discussions.")
                .click()
            })
        cy.navigateContractRatesForm('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Contacts/,
        }).should('exist')
        cy.fillOutStateContact()
        cy.deprecatedNavigateV1Form('CONTINUE')

        cy.findByRole('heading', { level: 2, name: /Supporting documents/ })
        cy.fillOutSupportingDocuments()
        cy.deprecatedNavigateV1Form('CONTINUE')

        // Store submission name for reference later
        let submissionId = ''
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            submissionId = pathnameArray[2]
        })

        cy.findByRole('heading', { level: 2, name: /Review and submit/ })

        // Submit, sent to dashboard
        cy.submitStateSubmissionForm()

        // View submission summary
        cy.location().then((loc) => {
            expect(loc.search).to.match(/.*justSubmitted=*/)
            const submissionName = loc.search.split('=').pop()
            if (submissionName === undefined) {
                throw new Error('No submission name found' + loc.search)
            }
            cy.findByText(`${submissionName} was sent to CMS`).should('exist')
            cy.get('table')
                .findByRole('link', { name: submissionName })
                .should('exist').click()
            cy.url({ timeout: 10_000 }).should('contain', submissionId)
            cy.findByTestId('submission-summary').should('exist')
            cy.findByRole('heading', {
                name: `Minnesota ${submissionName}`,
            }).should('exist')
            cy.findByText('Submitted').should('exist')
            cy.findByText('Rate details').should('exist')
            cy.findByText('New rate certification').should('exist')
            cy.findByText('02/29/2024 to 02/28/2025').should('exist')
            cy.findByText('Download all contract documents').should('exist')
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
           cy.findByText(/You must provide this information/).should('not.exist')

            // Link back to dashboard, submission visible in default program
            cy.findByText('Back to state dashboard').should('exist').click()
            cy.findByText('Submissions dashboard').should('exist')
            // check the table of submissions--find a draft row, then the link in the ID column
            cy.get('table')
                .contains('span', 'Draft')
                .eq(0)
                .parents('tr')
                .findByTestId('submission-id')
                .find('a')
                .should('have.attr', 'href')
                // draft submission URL is /submissions/${submission.id}/type
                .and('include', 'type')
            cy.get('table')
                .contains('span', 'Submitted')
                .eq(0)
                .parents('tr')
                .findByTestId('submission-id')
                .find('a')
                .should('have.attr', 'href')
                .and('include', 'submissions')
                // submitted submission URL is /submissions/${submission.id}
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
