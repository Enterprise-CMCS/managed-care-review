describe('CMS user can view submission', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    it('in the CMS dashboard', () => {
        // state user adds a new package
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()
        cy.fillOutBaseContractDetails()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Rate details/,
        }).should('exist')
        cy.fillOutAdditionalActuaryContact()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Contacts/,
        }).should('exist')
        cy.fillOutStateContact()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Supporting documents/,
        }).should('exist')
        cy.fillOutSupportingDocuments()
        cy.navigateFormByButtonClick('CONTINUE')

        // store submission id for reference later
        let submissionId = ''
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            submissionId = pathnameArray[2]
        })

        // submit package
        cy.findByRole('heading', { level: 2, name: /Review and submit/ })
        cy.submitStateSubmissionForm()

        // store submission name for later
        cy.location().then((loc) => {
            expect(loc.search).to.match(/.*justSubmitted=*/)
            const submissionName = loc.search.split('=').pop()
            if (submissionName === undefined) {
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
                .should('have.text', 'Contract action and rate certification')

            cy.get('table')
                .contains('a', submissionName)
                .should('have.attr', 'href')

            // can navigate to submission summary  by clicking link
            cy.findByText(submissionName).should('exist').click()
            cy.url({ timeout: 10_000 }).should('contain', submissionId)
            cy.findByTestId('submission-summary').should('exist')
        })
    })
})
