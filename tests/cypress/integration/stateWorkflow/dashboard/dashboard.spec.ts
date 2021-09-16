describe('submission summary', () => {
    it('user can complete a submission, load dashboard with default program, and see submission summary', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Fill out contract details
        cy.fillOutBaseContractDetails()
        cy.navigateForm('Continue')

        //Fill out rate details
        cy.findByLabelText('New rate certification').safeClick()
        cy.findByLabelText('Start date').type('02/29/2024')
        cy.findByLabelText('End date').type('02/28/2025')
        cy.findByLabelText('Date certified').type('03/01/2024')
        cy.navigateForm('Continue')
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
        // Continue to documents page
        cy.navigateForm('Continue')
        cy.fillOutDocuments()
        // Navigate review and submit page
        cy.navigateForm('Continue')
        // Store submission name for reference later
        let submissionId = ''
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            submissionId = pathnameArray[2]
        })
        // Submit, sent to dashboard
        cy.navigateForm('Submit')
        cy.findByRole('dialog').should('exist')
        cy.navigateForm('Confirm submit')
        cy.waitForLoadingToComplete()
        cy.findByText('Dashboard').should('exist')
        cy.findByText('PMAP').should('exist')
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
            cy.findByText('Rate details').should('exist')
            cy.findByText('New rate certification').should('exist')
            cy.findByText('02/29/2024 - 02/28/2025').should('exist')
            // Link back to dashboard, submission visible in default program
            cy.findByText('Back to state dashboard').should('exist').click()
            cy.findByText('Dashboard').should('exist')
            cy.findByText('PMAP').should('exist')
        })
    })
})
