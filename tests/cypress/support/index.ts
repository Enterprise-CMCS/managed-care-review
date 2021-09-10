// ***********************************************************
// support/index.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
import './loginCommands'
import './stateSubmissionFormCommands'

declare global {
    namespace Cypress {
        interface Chainable<Subject = any> {
            logInAsStateUser(): void
            logInAsCMSUser(args?: { initialURL?: string }): void
            safeClick(): void
            navigateForm(buttonName: string): Chainable<Element>
            waitForDocumentsToLoad(): void
            waitForLoadingToComplete(): void
            startNewContractOnlySubmission(): void
            startNewContractAndRatesSubmission(): void
            fillOutContractDetails(): void
            fillOutRateDetails(): void
            fillOutStateContacts(): void
            fillOutActuaryContacts(): void
            fillOutDocuments(): void
            submitStateSubmissionForm(): void
            verifyDocumentsHaveNoErrors(): void
        }
    }
}
