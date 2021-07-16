Cypress.Commands.add('startNewContractOnlySubmission', () => {
    cy.findByTestId('dashboardPage').should('exist')
    cy.findByRole('link', { name: 'Start new submission' }).click({
        force: true,
    })
    cy.location('pathname').should('eq', '/submissions/new')
    cy.findByText('New submission').should('exist')

    cy.findByLabelText('Contract action only').safeClick()
    cy.findByRole('combobox', { name: 'Program' }).select('msho')

    cy.findByRole('textbox', { name: 'Submission description' })
        .should('exist')
        .type('description of submission')

    cy.findByRole('button', {
        name: 'Continue',
    }).safeClick()

    cy.findByText(/^MN-MSHO-/).should('exist')
})
