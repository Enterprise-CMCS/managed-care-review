import { aliasQuery } from '../utils/graphql-test-utils'

Cypress.Commands.add(
    'navigateBackToCurrentSubmission',
    () => {
        cy.intercept('POST', '*/graphql', (req) => {
            aliasQuery(req, 'fetchSubmission2')
        })
        cy.findByText('View most recent version of this submission').click()
        cy.wait('@fetchSubmission2Query', { timeout: 20000 })
    }
)

Cypress.Commands.add(
    'navigateToSubmissionRevision',
    (linkTestId: string) => {
        cy.intercept('POST', '*/graphql', (req) => {
            aliasQuery(req, 'fetchSubmission2')
        })

        cy.findByTestId(linkTestId)
            .should('exist')
            .click()
        cy.wait('@fetchSubmission2Query', { timeout: 20000 })
    }
)
