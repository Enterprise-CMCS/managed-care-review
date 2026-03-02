describe('state user in eqro submission form', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })

    it('can navigate forward, back, and save as draft on each form page', () => {
        cy.interceptFeatureFlags({
            'eqro-submissions': true,
        })

        cy.logInAsStateUser()

        // Start new EQRO submission
        cy.startNewEQROSubmission()

        // go back to submission details and test navigation buttons
        cy.navigateContractForm('BACK')
        cy.findByRole('heading', { level: 2, name: /Submission details/ })
        cy.navigateContractForm('SAVE_DRAFT')
        cy.findByText('Draft was saved successfully.')

        // fill out contract details and fill in form
        cy.navigateContractForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Contract details/ })
        cy.fillOutEQROContractDetails()

        // continue to contacts page
        cy.navigateContractForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Contacts/ })

        // go back to contract details and save as draft
        cy.navigateContractForm('BACK')
        cy.findByRole('heading', { level: 2, name: /Contract details/ })
        cy.navigateContractForm('SAVE_DRAFT')
        cy.findByText('Draft was saved successfully.')

        // fill out contacts page
        cy.navigateContractForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Contacts/ })
        cy.fillOutStateContact()

        // continue to review and submit page
        cy.navigateContractForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Review and submit/ })

        // go back to contacts page and save as draft
        cy.navigateContractForm('BACK')
        cy.findByRole('heading', { level: 2, name: /Contacts/ })
        cy.navigateContractForm('SAVE_DRAFT')
        cy.findByText('Draft was saved successfully.')

        // continue to review submit page and submit EQRO contract
        cy.navigateContractForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Review and submit/ })
        let submissionId = ''
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            submissionId = pathnameArray[3]
        })
        cy.submitStateSubmissionForm({
            success: true,
            resubmission: false,
        })
         // store submission name for later
         cy.location().then((loc) => {
            expect(loc.search).to.match(/.*justSubmitted=*/)
            
            const urlParams = new URLSearchParams(loc.search)
            const submissionName = urlParams.get('justSubmitted')

            if (submissionName === undefined || submissionName === null) {
                throw new Error('No submission name found' + loc.search)
            }

            // sign out state user
            cy.logOut()
            //  sign in CMS user
            cy.logInAsCMSUser()
            cy.findByTestId('cms-dashboard-page').should('exist')
            cy.findByRole('table').should('exist')
            cy.findByText(submissionName).should('exist')
            // check the table of submissions

            // only one matching entry
            cy.get('table')
                .findAllByText(submissionName)
                .should('have.length', 1)

            // has proper row data
            cy.get('table')
                .should('exist')
                .findByText(submissionName)
                .parent()
                .findByTestId('submission-date')
                .should('not.be.empty')

            cy.get('table')
                .should('exist')
                .findByText(submissionName)
                .parent()
                .siblings('[data-testid="submission-status"]')
                .should('have.text', 'Submitted')

            cy.get('table')
                .contains('a', submissionName)
                .parents('tr')
                .findByTestId('submission-type')
                .should('have.text', 'Contract action only')

            cy.get('table')
                .contains('a', submissionName)
                .should('have.attr', 'href')

            // can navigate to submission summary  by clicking link
            cy.findByText(submissionName).should('exist').click()
            cy.url({ timeout: 10_000 }).should('contain', submissionId)
            cy.wait('@fetchContractQuery', { timeout: 20_000 })
            cy.findByTestId('submission-summary').should('exist')
         })
        // ensure download link text is present
        cy.contains('a', /download contract documents \(2 files\)/i)
        .should('be.visible')
        .and('have.attr', 'href')
        .then((href) => {
            expect(href).to.match(/\/zips\/contracts\/[^/]+\/[^/]+\.zip(\?|$)/)
        })
    })
})
