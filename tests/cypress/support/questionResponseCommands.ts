Cypress.Commands.add('addQuestion', ({
    documentPath
}: {
    documentPath: string
}) => {
    // Find Add questions button and click
    cy.findByRole('link', { name: /Add questions/}).should('exist').click()
    // Check we are on the Add questions page
    cy.findByRole('heading', { level: 2, name: /Add questions/}).should('exist')

    // Add document to question form
    cy.findByTestId('file-input-input').attachFile(
        documentPath
    )
    cy.waitForDocumentsToLoad()

    // Submit question
    cy.findByRole('button', { name: 'Add questions'}).should('exist').click()

    // Wait for re-fetching of health plan package.
    cy.wait('@fetchHealthPlanPackageWithQuestionsQuery', { timeout: 20000})
})
