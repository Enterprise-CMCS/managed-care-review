import { ContractSubmissionTypeRecord } from '@mc-review/constants'
import { stateUser } from '../../utils/apollo-test-utils'

describe('Admin user can release a submission to state', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })

    it('releases a submitted contract-only submission to state', () => {
        cy.apiCreateAndSubmitContractOnlySubmission(stateUser()).then(
            (contract) => {
                const submissionSummaryUrl = `/submissions/${ContractSubmissionTypeRecord[contract.contractSubmissionType]}/${contract.id}`

                cy.logInAsAdminUser({ initialURL: submissionSummaryUrl })

                cy.findByRole('link', { name: 'Released to state' })
                    .should('exist')
                    .click()

                cy.findByRole('heading', { name: 'Released to state' }).should(
                    'exist'
                )
                cy.findByTestId('date-picker-external-input').type(
                    '11/11/2024'
                )
                cy.findByTestId('releasedToStateReason').type(
                    'Admin release to state reason.'
                )
                cy.findByRole('button', { name: 'Released to state' })
                    .should('exist')
                    .click()

                cy.url({ timeout: 20_000 }).should(
                    'include',
                    submissionSummaryUrl
                )
                cy.findByTestId('submission-summary').should('exist')
                cy.findByTestId('submissionApprovedBanner').should('exist')
            }
        )
    })
})
