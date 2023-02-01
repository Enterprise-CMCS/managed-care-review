describe('Q&A', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
    })

    it('cannot navigate to and from Q&A page with cms-questions flag off', () => {
        cy.interceptFeatureFlags({
            'rate-cert-assurance': true,
            'cms-questions': false
        })
        cy.logInAsStateUser()

        // a submitted submission
        cy.startNewContractOnlySubmissionWithBaseContract()

        cy.fillOutBaseContractDetails()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Contacts/,
        }).should('exist')
        cy.fillOutStateContact()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', { level: 2, name: /Supporting documents/ })
        cy.navigateFormByButtonClick('CONTINUE')

        // Store submission name and url for reference later
        let submissionId = ''
        let submissionUrl = ''
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            submissionId = pathnameArray[2]
            submissionUrl = fullUrl.toString()
        })
        cy.findByRole('heading', { level: 2, name: /Review and submit/ })

        // Submit, sent to dashboard
        cy.submitStateSubmissionForm()
        cy.findByText('Dashboard').should('exist')
        cy.findByText('Programs').should('exist')

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
                .should('exist')
            cy.findByRole('link', { name: submissionName }).click()
            cy.url({ timeout: 10_000 }).should('contain', submissionId)
            cy.findByTestId('submission-summary').should('exist')
            cy.findByRole('heading', {
                name: `Minnesota ${submissionName}`,
            }).should('exist')

            //Try to visit Q&A page
            cy.visit(`/summary/${submissionId}/q&a`)

            // Look for 404 text on page
            cy.findByRole('heading', { name: '404 / Page not found', level: 1}).should('exist')
        })
    })

    it('can navigate to and from Q&A page', () => {
        cy.interceptFeatureFlags({
            'rate-cert-assurance': true,
            'cms-questions': true
        })
        cy.logInAsStateUser()

        // a submitted submission
        cy.startNewContractOnlySubmissionWithBaseContract()

        cy.fillOutBaseContractDetails()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Contacts/,
        }).should('exist')
        cy.fillOutStateContact()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', { level: 2, name: /Supporting documents/ })
        cy.navigateFormByButtonClick('CONTINUE')

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
        cy.findByText('Dashboard').should('exist')
        cy.findByText('Programs').should('exist')

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
                .should('exist')
            cy.findByRole('link', { name: submissionName }).click()
            cy.url({ timeout: 10_000 }).should('contain', submissionId)
            cy.findByTestId('submission-summary').should('exist')
            cy.findByRole('heading', {
                name: `Minnesota ${submissionName}`,
            }).should('exist')

            // Find QA Link and click
            cy.findByRole('link', { name: /Q&A/ }).click()
            cy.url({ timeout: 10_000 }).should('contain', `${submissionId}/q&a`)

            // Make sure Heading is correct with 'Upload questions' in addition to submission name
            cy.findByRole('heading', {
                name: `Minnesota ${submissionName} Upload questions`,
            }).should('exist')

            // Find submission summary link and click
            cy.findByRole('link', { name: /Submission summary/ }).click()
            cy.url({ timeout: 10_000 }).should('contain', submissionId)

            // Find back to dashboard link and click
            cy.findByText('Back to state dashboard').should('exist').click()
            cy.url({ timeout: 10_000 }).should('contain', 'dashboard')

            cy.get('table')
                .findByRole('link', { name: submissionName })
                .should('exist')
        })
    })
})
