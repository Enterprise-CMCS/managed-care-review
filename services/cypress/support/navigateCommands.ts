import { aliasQuery, aliasMutation } from '../utils/graphql-test-utils'

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

const isSubmissionEditUrl = /submissions\/([0-9a-fA-F-]+)\/edit/

Cypress.Commands.add(
    'navigateFormByButtonClick',
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
                cy.wait('@createHealthPlanPackageMutation', { timeout: 50_000 })
                cy.wait('@fetchHealthPlanPackageWithQuestionsQuery')
                cy.wait('@fetchHealthPlanPackageQuery')
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

Cypress.Commands.add(
    'navigateFormByDirectLink',
    (url: string, waitForLoad = true) => {
        cy.visit(url)
        if (waitForLoad) {
            if(isSubmissionEditUrl.test(url)) {
                cy.wait('@fetchHealthPlanPackageQuery', { timeout: 50_000 })
            } else {
                cy.wait('@fetchHealthPlanPackageWithQuestionsQuery', { timeout: 50_000 })
            }
        }
    }
)
