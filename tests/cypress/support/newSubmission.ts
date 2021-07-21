Cypress.Commands.add('startNewContractOnlySubmission', () => {
    cy.findByTestId('dashboardPage').should('exist')
    cy.findByRole('link', { name: 'Start new submission' }).click({
        force: true,
    })
    cy.location('pathname').should('eq', '/submissions/new')
    cy.findByText('New submission').should('exist')

    cy.findByLabelText('Contract action only').safeClick()
    cy.findByRole('combobox', { name: 'Program' }).select('pmap')

    cy.findByRole('textbox', { name: 'Submission description' })
        .should('exist')
        .type('description of contract only submission')

    cy.findByRole('button', {
        name: 'Continue',
    }).safeClick()
    cy.findByTestId('step-indicator')
        .findAllByText('Contract Details')
        .should('have.length', 2)
    cy.findByText(/^MN-PMAP-/).should('exist')
})

Cypress.Commands.add('startNewContractAndRatesSubmission', () => {
    cy.findByTestId('dashboardPage').should('exist')
    cy.findByRole('link', { name: 'Start new submission' }).click({
        force: true,
    })
    cy.location('pathname').should('eq', '/submissions/new')
    cy.findByText('New submission').should('exist')

    cy.findByLabelText('Contract action and rate certification').safeClick()
    cy.findByRole('combobox', { name: 'Program' }).select('pmap')

    cy.findByRole('textbox', { name: 'Submission description' })
        .should('exist')
        .type('description of rates submission')

    cy.findByRole('button', {
        name: 'Continue',
    }).safeClick()

    cy.findByTestId('step-indicator')
        .findAllByText('Contract Details')
        .should('have.length', 2)
    cy.findByText(/^MN-PMAP-/).should('exist')
})
