import { aliasQuery } from '../utils/graphql-test-utils'

Cypress.Commands.add(
    'navigateToSubmissionByUserInteraction',
    (testId: string) => {
        cy.intercept('POST', '*/graphql', (req) => {
            aliasQuery(req, 'fetchSubmission2')
        })
        cy.findByTestId(testId).should('exist').click()
        cy.wait('@fetchSubmission2Query', { timeout: 20000 })
    }
)
