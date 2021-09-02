Cypress.Commands.add('startNewContractOnlySubmission', () => {
    cy.findByTestId('dashboardPage').should('exist')
    cy.findByRole('link', { name: 'Start new submission' }).click({
        force: true,
    })
    // HM-TODO: Move this check to dashboard page
    cy.location('pathname').should('eq', '/submissions/new')
    // HM-TODO: Move this check to dashboard page
    cy.findByText('New submission').should('exist')

    // Fill out Submission type
    cy.findByRole('combobox', { name: 'Program' }).select('pmap')
    cy.findByLabelText('Contract action only').safeClick()
    cy.findByRole('textbox', { name: 'Submission description' })
        // HM-TODO: Move this check to dashboard page
        .should('exist')
        .type('description of contract only submission')
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('startNewContractAndRatesSubmission', () => {
    cy.findByTestId('dashboardPage').should('exist')
    cy.findByRole('link', { name: 'Start new submission' }).click({
        force: true,
    })
    // HM-TODO: Move this check to dashboard page
    cy.location('pathname').should('eq', '/submissions/new')
    // HM-TODO: Move this check to dashboard page
    cy.findByText('New submission').should('exist')

    // Fill out Submission type
    cy.findByRole('combobox', { name: 'Program' }).select('pmap')
    cy.findByLabelText('Contract action and rate certification').safeClick()
    cy.findByRole('textbox', { name: 'Submission description' })
        // HM-TODO: Move this check to dashboard page
        .should('exist')
        .type('description of contract and rates submission')
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutContractDetails', () => {
    // Must be on '/submissions/:id/contract-details'
    cy.findByLabelText('Base contract').safeClick()
    cy.findByLabelText('Start date').type('04/01/2024')
    cy.findByLabelText('End date').type('03/31/2025').blur()
    cy.findByLabelText('Managed Care Organization (MCO)').safeClick()
    cy.findByLabelText('1932(a) State Plan Authority').safeClick()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutRateDetails', () => {
    // Must be on '/submissions/:id/rate-details'
    cy.findByLabelText('New rate certification').safeClick()
    cy.findByLabelText('Start date').type('02/29/2024')
    cy.findByLabelText('End date').type('02/28/2025')
    cy.findByLabelText('Date certified').type('03/01/2024')
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutStateContact', () => {
    // Must be on '/submissions/:id/contacts'
    // State contact
    cy.findAllByLabelText('Name').eq(0).type('State Contact Person')
    cy.findAllByLabelText('Title/Role').eq(0).type('State Contact Title')
    cy.findAllByLabelText('Email').eq(0).type('statecontact@test.com')
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutActuaryContact', () => {
    // Actuary contact
    cy.findAllByLabelText('Name').eq(1).type('Actuary Contact Person')
    cy.findAllByLabelText('Title/Role').eq(1).type('Actuary Contact Title')
    cy.findAllByLabelText('Email').eq(1).type('actuarycontact@test.com')

    // Actuarial firm
    cy.findByLabelText('Mercer').safeClick()

    // Actuary communication preference
    cy.findByLabelText(
        `OACT can communicate directly with the state’s actuary but should copy the state on all written communication and all appointments for verbal discussions.`
    ).safeClick()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutDocuments', () => {
    // Must be on '/submissions/:id/documents'
    cy.findByTestId('file-input-input').attachFile(
        'documents/trussel-guide.pdf'
    )

    // HM-TODO: Move to documents specific Cypress test
    cy.findByText('Upload failed').should('not.exist')
    cy.findByText('Duplicate file').should('not.exist')

    cy.waitForDocumentsToLoad()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('reviewAndSubmitStateSubmissionForm', () => {
    // Must be on '/submissions/:id/review-and-submit'
    cy.navigateForm('Submit')
    // HM-TODO: Move this check to dashboard page
    cy.findByRole('dialog').should('exist')
    cy.navigateForm('Confirm submit')
})
