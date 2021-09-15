Cypress.Commands.add('startNewContractOnlySubmission', () => {
    cy.findByTestId('dashboard-page').should('exist')
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
    cy.navigateForm('Continue')
    cy.findByRole('heading', { level: 2, name: /Contract details/ })
})

Cypress.Commands.add('startNewContractAndRatesSubmission', () => {
    cy.findByTestId('dashboard-page').should('exist')
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
    cy.navigateForm('Continue')
    cy.findByRole('heading', { level: 2, name: /Contract details/ })
})

Cypress.Commands.add('fillOutContractDetails', () => {
    // Must be on '/submissions/:id/contract-details'
    cy.findByLabelText('Base contract').safeClick()
    cy.wait(1000) // wait to be sure that React renders the appropriate sub fields for contract type
    cy.findByLabelText('Start date').type('04/01/2024')
    cy.findByLabelText('End date').type('03/31/2025').blur()
    cy.findByLabelText('Managed Care Organization (MCO)').safeClick()
    cy.findByLabelText('1932(a) State Plan Authority').safeClick()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutNewRateCertification', () => {
    // Must be on '/submissions/:id/rate-details'
    // Must be a contract and rates submission
    cy.findByLabelText('New rate certification').safeClick()
    cy.wait(1000) // wait to be sure that React renders the appropriate sub fields for contract type
    cy.findByLabelText('Start date').type('02/29/2024')
    cy.findByLabelText('End date').type('02/28/2025')
    cy.findByLabelText('Date certified').type('03/01/2024')
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutAmendmentToPriorRateCertification', () => {
    // Must be on '/submissions/:id/rate-details'
    // Must be a contract and rates submission
    // Must have filled out a new rate certification
    cy.findByLabelText('Amendment to prior rate certification').safeClick()
    cy.wait(1000) // wait to be sure that React renders the appropriate sub fields for contract type
    cy.findAllByLabelText('Start date').eq(0).should('have.value', '02/29/2024')
    cy.findAllByLabelText('End date').eq(0).should('have.value', '02/28/2025')
    cy.findByLabelText('Date certified for rate amendment').should(
        'have.value',
        '03/01/2024'
    )
    cy.findAllByLabelText('Start date').eq(1).type('03/01/2024')
    cy.findAllByLabelText('End date').eq(1).type('03/01/2025')
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutStateContact', () => {
    // Must be on '/submissions/:id/contacts'
    cy.findAllByLabelText('Name').eq(0).type('State Contact Person')
    cy.findAllByLabelText('Title/Role').eq(0).type('State Contact Title')
    cy.findAllByLabelText('Email').eq(0).type('statecontact@test.com')
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutActuaryContact', () => {
    // Must be on '/submissions/:id/contacts'
    // Must be a contract and rates submission
    cy.findAllByLabelText('Name').eq(1).type('Actuary Contact Person')
    cy.findAllByLabelText('Title/Role').eq(1).type('Actuary Contact Title')
    cy.findAllByLabelText('Email').eq(1).type('actuarycontact@test.com')

    // Actuarial firm
    cy.findAllByLabelText('Mercer').eq(0).safeClick()

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

    cy.verifyDocumentsHaveNoErrors()
    cy.waitForDocumentsToLoad()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('submitStateSubmissionForm', () => {
    // Must be on '/submissions/:id/review-and-submit'
    cy.navigateForm('Submit')
    // HM-TODO: Move this check to dashboard page
    cy.findByRole('dialog').should('exist')
    cy.navigateForm('Confirm submit')
})

Cypress.Commands.add('waitForDocumentsToLoad', () => {
    const authMode = Cypress.env('AUTH_MODE')
    if (authMode !== 'LOCAL') {
        // Must wait for scanning to complete in AWS environments
        cy.wait(20000)
    }
    cy.findAllByTestId('file-input-preview-image', {
        timeout: 20000,
    }).should('not.have.class', 'is-loading')
})

Cypress.Commands.add('verifyDocumentsHaveNoErrors', () => {
    cy.findByText('Upload failed').should('not.exist')
    cy.findByText('Duplicate file').should('not.exist')
    cy.findByText('Failed security scan, please remove').should('not.exist')
})
