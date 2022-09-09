import { aliasQuery } from '../utils/graphql-test-utils'

Cypress.Commands.add(
    'clickSubmissionLink',
    (testId: string) => {
        cy.intercept('POST', '*/graphql', (req) => {
            aliasQuery(req, 'fetchHealthPlanPackage')
        })
        cy.findByTestId(testId).should('exist').click()
        cy.wait('@fetchHealthPlanPackageQuery', { timeout: 20000 })
    }
)
