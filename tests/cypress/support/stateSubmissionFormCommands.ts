Cypress.Commands.add('startNewContractOnlySubmission', () => {
    // Must be on '/submissions/new'
    cy.findByTestId('dashboard-page').should('exist')
    cy.findByRole('link', { name: 'Start new submission' }).click({
        force: true,
    })
    cy.findByRole('heading', { level: 1, name: /New submission/ })

    cy.fillOutContractActionOnly()

    cy.navigateForm('Continue')
    cy.findByRole('heading', { level: 2, name: /Contract details/ })
})

Cypress.Commands.add('startNewContractAndRatesSubmission', () => {
    // Must be on '/submissions/new'
    cy.findByTestId('dashboard-page').should('exist')
    cy.findByRole('link', { name: 'Start new submission' }).click({
        force: true,
    })
    cy.findByRole('heading', { level: 1, name: /New submission/ })

    cy.fillOutContractActionAndRateCertification()

    cy.navigateForm('Continue')
    cy.findByRole('heading', { level: 2, name: /Contract details/ })
})

Cypress.Commands.add('fillOutContractActionOnly', () => {
    // Must be on '/submissions/new'
    cy.findByRole('combobox', { name: 'programs (required)' }).click({
        force: true,
    })
    cy.findByText('PMAP').click()
    cy.findByText('Contract action only').click()
    cy.findByRole('textbox', { name: 'Submission description' }).type(
        'description of contract only submission'
    )
})

Cypress.Commands.add('fillOutContractActionAndRateCertification', () => {
    // Must be on '/submissions/new'
    cy.findByRole('combobox', { name: 'programs (required)' }).click({
        force: true,
    })
    cy.findByText('PMAP').click()
    cy.findByText('Contract action and rate certification').click()
    cy.findByRole('textbox', { name: 'Submission description' }).type(
        'description of contract and rates submission'
    )
})

Cypress.Commands.add('fillOutBaseContractDetails', () => {
    // Must be on '/submissions/:id/contract-details'
    cy.findByText('Base contract').click()
    cy.wait(2000)
    cy.findByLabelText('Start date').type('04/01/2024')
    cy.findByLabelText('End date').type('03/31/2025').blur()
    cy.findByLabelText('Managed Care Organization (MCO)').safeClick()
    cy.findByLabelText('1932(a) State Plan Authority').safeClick()
    cy.findByTestId('file-input-input').attachFile(
        'documents/trussel-guide.pdf'
    )

    cy.verifyDocumentsHaveNoErrors()
    cy.waitForDocumentsToLoad()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutAmendmentToBaseContractDetails', () => {
    // Must be on '/submissions/:id/contract-details'
    cy.findByText('Amendment to base contract').click()
    cy.wait(2000)
    cy.findByLabelText('Start date').type('04/01/2024')
    cy.findByLabelText('End date').type('03/31/2025').blur()
    cy.findByLabelText('Managed Care Organization (MCO)').safeClick()
    cy.findByLabelText('1932(a) State Plan Authority').safeClick()
    cy.findByLabelText('Benefits provided').safeClick()
    cy.findByLabelText('Financial incentives').safeClick()
    cy.findByText('No').click()
    cy.findByTestId('file-input-input').attachFile(
        'documents/trussel-guide.pdf'
    )

    cy.verifyDocumentsHaveNoErrors()
    cy.waitForDocumentsToLoad()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutNewRateCertification', () => {
    // Must be on '/submissions/:id/rate-details'
    // Must be a contract and rates submission
    cy.findByText('New rate certification').click()
    cy.wait(2000)
    cy.findByLabelText('Start date').type('02/29/2024')
    cy.findByLabelText('End date').type('02/28/2025')
    cy.findByLabelText('Date certified').type('03/01/2024')
    cy.findByTestId('file-input-input').attachFile(
        'documents/trussel-guide.pdf'
    )

    cy.verifyDocumentsHaveNoErrors()
    cy.waitForDocumentsToLoad()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutAmendmentToPriorRateCertification', () => {
    // Must be on '/submissions/:id/rate-details'
    // Must be a contract and rates submission
    cy.findByText('Amendment to prior rate certification').click()
    cy.wait(2000)
    cy.findAllByLabelText('Start date').eq(0).type('02/29/2024')
    cy.findAllByLabelText('End date').eq(0).type('02/28/2025')
    cy.findAllByLabelText('Start date').eq(1).type('03/01/2024')
    cy.findAllByLabelText('End date').eq(1).type('03/01/2025')
    cy.findByLabelText('Date certified for rate amendment').type('03/01/2024')
    cy.findByTestId('file-input-input').attachFile(
        'documents/trussel-guide.pdf'
    )

    cy.verifyDocumentsHaveNoErrors()
    cy.waitForDocumentsToLoad()
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
    cy.findByText(
        `OACT can communicate directly with the state’s actuary but should copy the state on all written communication and all appointments for verbal discussions.`
    ).click()
    cy.findAllByTestId('errorMessage').should('have.length', 0)
})

Cypress.Commands.add('fillOutDocuments', () => {
    // Must be on '/submissions/:id/documents'
    cy.findByTestId('file-input-input').attachFile(
        'documents/trussel-guide.pdf'
    )

    cy.verifyDocumentsHaveNoErrors()
    cy.findByTestId('upload-finished-indicator')
    cy.findAllByTestId('errorMessage').should('have.length', 0)
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
    cy.findByText('Remove files with errors').should('not.exist')
})

Cypress.Commands.add('submitStateSubmissionForm', () => {
    // Must be on '/submissions/:id/review-and-submit'
    cy.navigateForm('Submit')
    // HM-TODO: Move this check to dashboard page
    cy.findAllByTestId('modalWindow')
        .should('exist')
        .within(($modal) => {
            cy.findByTestId('modal-submit').click()
        })
})
