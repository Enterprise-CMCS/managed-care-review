// ***********************************************
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
import '@cypress-audit/pa11y/commands'
import '@testing-library/cypress/add-commands'
import 'cypress-file-upload'
import 'cypress-pipe'
import {aliasMutation, aliasQuery} from '../utils/graphql-test-utils';


const LOCAL_STORAGE_MEMORY = {}

Cypress.Commands.add('saveLocalStorage', () => {
    Object.keys(localStorage).forEach((key) => {
        LOCAL_STORAGE_MEMORY[key] = localStorage[key]
    })
})

Cypress.Commands.add('restoreLocalStorage', () => {
    Object.keys(LOCAL_STORAGE_MEMORY).forEach((key) => {
        localStorage.setItem(key, LOCAL_STORAGE_MEMORY[key])
    })
})

/**
 * This will help with flaky behavior in cypress where there is a race condition
 * between the test runner and the app itself and its lifecycle. The problem
 * comes from the app detaching DOM elements before cypress runs actions on
 * them.
 *
 * See more details on this thread: https://github.com/cypress-io/cypress/issues/7306
 * This will probably be natively supported by cypress at some point.
 *
 * The pipe solution comes from this article cypress offers as a workaround the
 * problem for the time being.
 * https://www.cypress.io/blog/2019/01/22/when-can-the-test-click/
 */

Cypress.Commands.add('safeClick', { prevSubject: 'element' }, ($element) => {
    const click = ($el) => $el.click()
    return cy.wrap($element).should('exist').should('be.visible').wait(500).pipe(click)
})

Cypress.Commands.add('interceptGraphQL', () => {
    cy.intercept('POST', '*/graphql', (req) => {
        aliasQuery(req, 'fetchCurrentUser')
        aliasQuery(req, 'indexUsers')
        aliasQuery(req, 'fetchHealthPlanPackage')
        aliasQuery(req, 'fetchHealthPlanPackageWithQuestions')
        aliasQuery(req, 'indexHealthPlanPackages')
        aliasQuery(req, 'indexRates')
        aliasMutation(req, 'createHealthPlanPackage')
        aliasMutation(req, 'updateHealthPlanFormData')
        aliasMutation(req, 'submitHealthPlanPackage')
        aliasMutation(req, 'updateCMSUser')
        aliasMutation(req, 'createQuestion')
        aliasMutation(req, 'createQuestionResponse')
        aliasMutation(req, 'fetchContract')
        aliasMutation(req, 'updateDraftContractRates')
        aliasMutation(req, 'submitContract')
    }).as('GraphQL')
})

