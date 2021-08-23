describe('rate details', () => {
    it('user can add a rates amendment', () => {
        cy.login()
        cy.startNewContractAndRatesSubmission()

        // Fill out Contract details
        cy.findByRole('heading', { name: /Contract details/ })
        cy.findByLabelText('Amendment to base contract')
            .should('exist')
            .safeClick()
        cy.findByLabelText('Amendment to base contract').should('be.checked')
        cy.findByRole('button', {
            name: 'Continue',
        }).safeClick()
        cy.findByLabelText('Start date').should('exist').type('03/01/2024')
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
            .findAllByText('Rate details')
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
        cy.findByLabelText('Amendment to base contract').should('be.checked')
        cy.findByLabelText('Start date').should('have.value', '03/01/2024')
        cy.findByLabelText('End date').should('have.value', '03/31/2026')
        cy.findByLabelText('Managed Care Organization (MCO)').should(
            'be.checked'
        )
        cy.findByLabelText('1932(a) State Plan Authority').should('be.checked')
        cy.findByLabelText('Capitation rates').should('be.checked')
        cy.findByLabelText('Annual rate update').should('be.checked')
    })
})
