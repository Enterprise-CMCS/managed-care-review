Cypress.Commands.add(
    'clickSubmissionLink',
    (testId: string) => {
        cy.findByTestId(testId).should('exist').click()
        if (testId === 'currentSubmissionLink') {
            cy.wait('@fetchHealthPlanPackageWithQuestionsQuery', { timeout: 20_000 })
        } else {
            cy.wait('@fetchHealthPlanPackageQuery', { timeout: 20_000 })
        }
    }
)
