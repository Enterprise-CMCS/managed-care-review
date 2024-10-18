Cypress.Commands.add(
    'clickSubmissionLink',
    (testId: string) => {
        cy.findByTestId(testId).should('exist').click()
        if (testId === 'currentSubmissionLink') {
            cy.wait('@fetchContractWithQuestionsQuery', { timeout: 20_000 })
        } else {
            cy.wait('@fetchContractQuery', { timeout: 20_000 })
        }
    }
)
