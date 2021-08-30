Cypress.Commands.add('startNewContractOnlySubmission', () => {
    cy.findByTestId('dashboardPage').should('exist')
    cy.findByRole('link', { name: 'Start new submission' }).click({
        force: true,
    })
    cy.location('pathname').should('eq', '/submissions/new')
    cy.findByText('New submission').should('exist')

    // Fill out Submission type
    cy.findByLabelText('Contract action only').safeClick()
    cy.findByRole('combobox', { name: 'Program' }).select('pmap')
    cy.findByRole('textbox', { name: 'Submission description' })
        .should('exist')
        .type('description of contract only submission')

    cy.navigateForm('Continue')

    cy.findByText(/^MN-PMAP-/).should('exist')
})

Cypress.Commands.add('startNewContractAndRatesSubmission', () => {
    cy.findByTestId('dashboardPage').should('exist')
    cy.findByRole('link', { name: 'Start new submission' }).click({
        force: true,
    })
    cy.location('pathname').should('eq', '/submissions/new')
    cy.findByText('New submission').should('exist')

    // Fill out Submission type
    cy.findByLabelText('Contract action and rate certification').safeClick()
    cy.findByRole('combobox', { name: 'Program' }).select('pmap')
    cy.findByRole('textbox', { name: 'Submission description' })
        .should('exist')
        .type('description of contract and rates submission')

    cy.navigateForm('Continue')

    cy.findByText(/^MN-PMAP-/).should('exist')
})

Cypress.Commands.add('fillOutContractDetails', () => {
    cy.findByLabelText('Base contract').safeClick()
    cy.findByLabelText('Start date').type('04/01/2024')
    cy.findByLabelText('End date').type('03/31/2025').blur()
    cy.findByLabelText('Managed Care Organization (MCO)').safeClick()
    cy.findByLabelText('1932(a) State Plan Authority').safeClick()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutRateDetails', () => {
    cy.findByLabelText('New rate certification').safeClick()
    cy.findByLabelText('Start date').type('02/29/2024')
    cy.findByLabelText('End date').type('02/28/2025')
    cy.findByLabelText('Date certified').type('03/01/2024')
})

Cypress.Commands.add('fillOutContacts', () => {
    // State contact
    cy.findAllByLabelText('Name').eq(0).type('Test Person')
    cy.findAllByLabelText('Title/Role').eq(0).type('Fancy Title')
    cy.findAllByLabelText('Email').eq(0).type('test@test.com')

    // Actuary contact
    cy.findAllByLabelText('Name').eq(1).type('Act Person')
    cy.findAllByLabelText('Title/Role').eq(1).type('Act Title')
    cy.findAllByLabelText('Email').eq(1).type('act@test.com')
    cy.findByLabelText('Mercer').safeClick()

    // Select actuary communication preference
    cy.findByLabelText(
        `OACT can communicate directly with the state’s actuary but should copy the state on all written communication and all appointments for verbal discussions.`
    ).safeClick()
})

Cypress.Commands.add('fillOutDocuments', () => {
    cy.findByTestId('file-input-input').attachFile(
        'documents/trussel-guide.pdf'
    )
    cy.findByText('Upload failed').should('not.exist')
    cy.findByText('Duplicate file').should('not.exist')
    cy.waitForDocumentsToLoad()
})
