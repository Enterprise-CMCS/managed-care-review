describe('dashboard', () => {
    it('can navigate to and from dashboard page', () => {
        cy.logInAsStateUser()
        cy.findByRole('heading', { level: 1, name: /Dashboard/ })

        cy.findByRole('link', { name: 'Start new submission' }).click({
            force: true,
        })
        cy.findByRole('heading', { level: 1, name: /New submission/ })
    })

    it('can see submission summary', () => {
        cy.logInAsStateUser()

        // add a draft submission
        cy.startNewContractAndRatesSubmission()
        cy.findByRole('button', { name: /Save as draft/ }).click()

        // a submitted submission
        cy.startNewContractAndRatesSubmission()

        cy.fillOutBaseContractDetails()
        cy.navigateForm('Continue')

        cy.fillOutNewRateCertification()
        cy.navigateForm('Continue')

        cy.fillOutStateContact()
        cy.fillOutActuaryContact()
        cy.navigateForm('Continue')

        cy.fillOutDocuments()
        cy.navigateForm('Continue')

        // Store submission name for reference later
        let submissionId = ''
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            submissionId = pathnameArray[2]
        })

        // Submit, sent to dashboard
        cy.submitStateSubmissionForm()
        cy.waitForApiToLoad()
        cy.findByText('Dashboard').should('exist')
        cy.findByText('Programs').should('exist')

        // View submission summary
        cy.location().then((loc) => {
            expect(loc.search).to.match(/.*justSubmitted=*/)
            const submissionName = loc.search.split('=').pop()
            cy.findByText(`${submissionName} was sent to CMS`).should('exist')
            cy.findByText(submissionName).should('exist').click()
            cy.url({ timeout: 10_000 }).should('contain', submissionId)
            cy.findByTestId('submission-summary').should('exist')
            cy.findByRole('heading', {
                name: `Minnesota ${submissionName}`,
            }).should('exist')
            cy.findByText('Submitted').should('exist')
            cy.findByText('Last updated').should('exist')
            cy.findByText('Rate details').should('exist')
            cy.findByText('New rate certification').should('exist')
            cy.findByText('02/29/2024 - 02/28/2025').should('exist')
            // Link back to dashboard, submission visible in default program
            cy.findByText('Back to state dashboard').should('exist').click()
            cy.findByText('Dashboard').should('exist')
            // check the table of submissions--find a draft row, then the link in the ID colum
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
        })
    })
})
