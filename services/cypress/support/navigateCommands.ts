type FormButtonKey =
    | 'CONTINUE_FROM_START_NEW'
    | 'CONTINUE'
    | 'SAVE_DRAFT'
    | 'BACK'
type FormButtons = { [key in FormButtonKey]: string }
const buttonsWithLabels: FormButtons = {
    CONTINUE: 'Continue',
    CONTINUE_FROM_START_NEW: 'Continue',
    SAVE_DRAFT: 'Save as draft',
    BACK: 'Back',
}

// can be deleted when Contract API is complete
Cypress.Commands.add(
    'deprecatedNavigateV1Form',
    (buttonKey: FormButtonKey, waitForLoad = true) => {
        cy.findByRole('button', {
            name: buttonsWithLabels[buttonKey],
        }).should('not.have.attr', 'aria-disabled')
        cy.findByRole('button', {
            name: buttonsWithLabels[buttonKey],
        }).safeClick()

        if (buttonKey === 'SAVE_DRAFT') {
            if(waitForLoad) {
                cy.wait('@updateHealthPlanFormDataMutation', { timeout: 50_000})
             }
            cy.findByTestId('state-dashboard-page').should('exist')
            cy.findByRole('heading',{name:'Submissions'}).should('exist')
        } else if (buttonKey === 'CONTINUE_FROM_START_NEW') {
            if (waitForLoad) {
                // cy.wait('@createHealthPlanPackageMutation', { timeout: 50_000 })
                cy.wait('@fetchContractWithQuestionsQuery')
            }
            cy.findByTestId('state-submission-form-page').should('exist')
        } else if (buttonKey === 'CONTINUE') {
            if (waitForLoad) {
                cy.findAllByTestId('errorMessage').should('have.length', 0)
                cy.wait('@updateHealthPlanFormDataMutation', { timeout: 50_000})
            }
            cy.findByTestId('state-submission-form-page').should('exist')
        } else {
            cy.findByTestId('state-submission-form-page').should('exist')
        }
    }
)
// navigate helper for v2 forms
Cypress.Commands.add(
    'navigateContractRatesForm',
    (buttonKey: FormButtonKey, waitForLoad = true) => {
        cy.findByRole('button', {
            name: buttonsWithLabels[buttonKey],
        }).should('not.have.attr', 'aria-disabled')
        cy.findByRole('button', {
            name: buttonsWithLabels[buttonKey],
        }).safeClick()

        if (buttonKey === 'SAVE_DRAFT') {
            if(waitForLoad) {
                cy.wait('@updateDraftContractRatesMutation', { timeout: 50_000})
            }
            cy.findByTestId('state-dashboard-page').should('exist')
            cy.findByRole('heading',{name:'Submissions'}).should('exist')
        } else if (buttonKey === 'CONTINUE_FROM_START_NEW') {
            if (waitForLoad) {
                // cy.wait('@createContractMutation', { timeout: 50_000 })
                cy.wait('@fetchContractQuery', { timeout: 20_000 })
            }
            cy.findByTestId('state-submission-form-page').should('exist')
        } else if (buttonKey === 'CONTINUE') {
            if (waitForLoad) {
                cy.findAllByTestId('errorMessage').should('have.length', 0)
                cy.wait('@updateDraftContractRatesMutation', { timeout: 50_000})
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
    (buttonKey: FormButtonKey, waitForLoad = true) => {
        cy.findByRole('button', {
            name: buttonsWithLabels[buttonKey],
        }).should('not.have.attr', 'aria-disabled')
        cy.findByRole('button', {
            name: buttonsWithLabels[buttonKey],
        }).safeClick()

        if (buttonKey === 'SAVE_DRAFT') {
            if(waitForLoad) {
                cy.wait('@updateContractDraftRevisionMutation', { timeout: 50_000})
            }
            cy.findByTestId('state-dashboard-page').should('exist')
            cy.findByRole('heading',{name:'Submissions'}).should('exist')
        } else if (buttonKey === 'CONTINUE_FROM_START_NEW') {
            if (waitForLoad) {
                // cy.wait('@createContractMutation', { timeout: 50_000 })
                cy.wait('@fetchContractQuery', { timeout: 20_000 })
            }
            cy.findByTestId('state-submission-form-page').should('exist')
        } else if (buttonKey === 'CONTINUE') {
            if (waitForLoad) {
                cy.findAllByTestId('errorMessage').should('have.length', 0)
                // cy.wait('@updateContractDraftRevisionMutation', { timeout: 50_000})
            }
            cy.findByTestId('state-submission-form-page').should('exist')
        } else {
            cy.findByTestId('state-submission-form-page').should('exist')
        }
    }
)

Cypress.Commands.add(
    'navigateFormByDirectLink',
    (url: string, waitForLoad = true) => {
        cy.visit(url)
        if (waitForLoad) {
            cy.wait('@fetchContractWithQuestionsQuery', { timeout: 50_000 })
        }
    }
)
