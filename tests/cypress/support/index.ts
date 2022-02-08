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
            // commands
            safeClick(): void
            navigateForm(buttonName: string): Chainable<Element>
            waitForApiToLoad(): void

            // login commands
            logInAsStateUser(): void
            logInAsCMSUser(args?: { initialURL?: string }): void

            // state submission form commands
            waitForDocumentsToLoad(): void
            startNewContractOnlySubmission(): void
            startNewContractAndRatesSubmission(): void
            fillOutContractActionOnly(): void
            fillOutContractActionAndRateCertification(): void
            fillOutBaseContractDetails(): void
            fillOutAmendmentToBaseContractDetails(): void
            fillOutNewRateCertification(): void
            fillOutAmendmentToPriorRateCertification(): void
            fillOutStateContact(): void
            fillOutActuaryContact(): void
            fillOutSupportingDocuments(): void
            waitForDocumentsToLoad(): void
            verifyDocumentsHaveNoErrors(): void
            submitStateSubmissionForm(): void
        }
    }
}
