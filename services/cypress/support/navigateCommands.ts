export type FormButtonKey =
    | 'CONTINUE_FROM_START_NEW'
    | 'CONTINUE'
    | 'SAVE_AND_CONTINUE'
    | 'SAVE_DRAFT'
    | 'BACK'
type FormButtons = { [key in FormButtonKey]: string }
const buttonsWithLabels: FormButtons = {
    CONTINUE: 'Continue',
    // The Submission details page is the only page that labels its primary action
    // 'Save & Continue' - both when starting a new submission and when editing a draft.
    CONTINUE_FROM_START_NEW: 'Save & Continue',
    SAVE_AND_CONTINUE: 'Save & Continue',
    SAVE_DRAFT: 'Save as draft',
    BACK: 'Back',
}

// navigate helper for v2 forms
Cypress.Commands.add(
    'navigateContractRatesForm',
    (buttonKey: FormButtonKey, waitForLoad: boolean = true) => {
        cy.findByRole('button', {
            name: buttonsWithLabels[buttonKey],
        }).should('not.have.attr', 'aria-disabled')
        cy.findByRole('button', {
            name: buttonsWithLabels[buttonKey],
        }).safeClick()

        if (buttonKey === 'SAVE_DRAFT') {
            if (waitForLoad) {
                cy.wait('@updateDraftContractRatesMutation', {
                    timeout: 50_000,
                })
            }
            cy.get('[data-testid="saveAsDraftSuccessBanner"]').should('exist')
        } else if (buttonKey === 'CONTINUE_FROM_START_NEW') {
            if (waitForLoad) {
                cy.wait('@fetchContractQuery', { timeout: 20_000 })
            }
            cy.findByTestId('state-submission-form-page').should('exist')
        } else if (
            buttonKey === 'CONTINUE' ||
            buttonKey === 'SAVE_AND_CONTINUE'
        ) {
            if (waitForLoad) {
                cy.findAllByTestId('errorMessage').should('have.length', 0)
                cy.wait('@updateDraftContractRatesMutation', {
                    timeout: 50_000,
                })
            }
            cy.findByTestId('state-submission-form-page').should('exist')
        } else {
            cy.findByTestId('state-submission-form-page').should('exist')
        }
    }
)

// navigate helper for v2 forms
Cypress.Commands.add(
    'navigateContractForm',
    (buttonKey: FormButtonKey, waitForLoad: boolean = true) => {
        cy.findByRole('button', {
            name: buttonsWithLabels[buttonKey],
        }).should('not.have.attr', 'aria-disabled')
        cy.findByRole('button', {
            name: buttonsWithLabels[buttonKey],
        }).safeClick()

        if (buttonKey === 'SAVE_DRAFT') {
            if (waitForLoad) {
                cy.wait('@updateContractDraftRevisionMutation', {
                    timeout: 50_000,
                })
            }
            cy.findByTestId('saveAsDraftSuccessBanner').should('exist')
        } else if (buttonKey === 'CONTINUE_FROM_START_NEW') {
            if (waitForLoad) {
                // cy.wait('@createContractMutation', { timeout: 50_000 })
                cy.wait('@fetchContractQuery', { timeout: 20_000 })
            }
            cy.findByTestId(/-submission-form-page/).should('exist')
        } else if (
            buttonKey === 'CONTINUE' ||
            buttonKey === 'SAVE_AND_CONTINUE'
        ) {
            if (waitForLoad) {
                cy.findAllByTestId('errorMessage').should('have.length', 0)
                cy.wait('@updateContractDraftRevisionMutation', { timeout: 50_000})
            }
            cy.findByTestId(/-submission-form-page/).should('exist')
        } else {
            cy.findByTestId(/-submission-form-page/).should('exist')
        }
    }
)

Cypress.Commands.add(
    'navigateFormByDirectLink',
    (url: string, waitForLoad: boolean = true) => {
        cy.visit(url)
        if (waitForLoad) {
            cy.wait('@fetchContractWithQuestionsQuery', { timeout: 50_000 })
        }
    }
)

Cypress.Commands.add('navigateToDashboard', () => {
    cy.visit('/')
    cy.wait('@fetchCurrentUserQuery', { timeout: 50_000 })
    cy.wait('@indexContractsStrippedQuery', { timeout: 50_000 })
})
