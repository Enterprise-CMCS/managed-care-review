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
import './login'
import './newSubmission'

declare global {
    namespace Cypress {
        interface Chainable<Subject = any> {
            login(): void
            safeClick(): void
            navigateForm(buttonName: string): Chainable<Element>
            startNewContractAndRatesSubmission()
            startNewContractOnlySubmission()
            waitForDocumentsToLoad()
        }
    }
}
