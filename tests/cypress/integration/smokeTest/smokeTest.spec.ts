describe('smoke test', () => {
    it('can log in as a state user', () => {
        cy.loginAsStateUser()
        cy.url().should('eq', Cypress.config().baseUrl + '/dashboard')
    })

    it('can create and submit a new contract only submission', () => {
        cy.loginAsStateUser()

        cy.startNewContractOnlySubmission()

        cy.fillOutContractDetails()
        cy.navigateForm('Continue')

        cy.fillOutStateContact()
        cy.navigateForm('Continue')

        cy.fillOutDocuments()
        cy.navigateForm('Continue')

        cy.reviewAndSubmitStateSubmissionForm()

        cy.findByText('Dashboard').should('exist')
        cy.findByText(/was sent to CMS/).should('exist')
    })

    it('can create and submit a new contract and rates submission', () => {
        cy.loginAsStateUser()

        cy.startNewContractAndRatesSubmission()

        cy.fillOutContractDetails()
        cy.navigateForm('Continue')

        cy.fillOutRateDetails()
        cy.navigateForm('Continue')

        cy.fillOutStateContact()
        cy.fillOutActuaryContact()
        cy.navigateForm('Continue')

        cy.fillOutDocuments()
        cy.navigateForm('Continue')

        cy.reviewAndSubmitStateSubmissionForm()

        cy.findByText('Dashboard').should('exist')
        cy.findByText(/was sent to CMS/).should('exist')
    })

    // HM-TODO: Write test to log in as a CMS user
    it('can log in as a CMS user', () => {})
})
