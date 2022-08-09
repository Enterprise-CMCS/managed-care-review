describe('CMS User can view submission', () => {
        // state user adds a new package
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()
        cy.fillOutBaseContractDetails()
        cy.navigateForm('CONTINUE')
        cy.fillOutNewRateCertification()
        cy.navigateForm('CONTINUE')
        cy.fillOutStateContact()
        cy.fillOutActuaryContact()
        cy.navigateForm('CONTINUE')
        cy.fillOutSupportingDocuments()
        cy.navigateForm('CONTINUE')

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
        cy.findByText('Dashboard').should('exist')
        cy.findByText('Programs').should('exist')

        // store submission name for later
        cy.location().then((loc) => {
            expect(loc.search).to.match(/.*justSubmitted=*/)
            const submissionName = loc.search.split('=').pop()
            if (submissionName === undefined) {
                throw new Error('No submission name found' + loc.search)
            }

        // sign out state user
            cy.findByRole('button', {
                    name: 'Sign out',
                })
                    .should('exist')
                    .click()
            //  sign in CMS user 
            cy.logInAsCMSUser()
            cy.findByTestId('dashboard').should('exist')
            cy.findByText('Dashboard').should('exist') 
            cy.findByText(submissionName).should('exist')
            // check the table of submissions--find a draft row, then the link in the ID column
            cy.get('table')
                .contains('span', 'Submitted')
                .eq(1)
                .parents('tr')
                .findByTestId('submission-id')
                .find('a')
                .should('have.attr', 'href')
                // draft submission URL is /submissions/${submission.id}/type
                .and('include', 'type')
            cy.get('table')
                .contains('span', 'draft')
                .eq(0)
            cy.get('table')
                .contains('span', 'Submitted')
                .eq(0)
                .parents('tr')
                .findByTestId('submission-date')
                .should('not.be.empty')
            })
        })
    
})
