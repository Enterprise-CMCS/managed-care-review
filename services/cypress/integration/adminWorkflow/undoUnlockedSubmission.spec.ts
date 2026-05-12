import { ContractSubmissionTypeRecord } from '@mc-review/constants'
import { stateUser } from '../../utils/apollo-test-utils'

describe('Admin user can undo an unlocked submission', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })

    it('restores a CMS-unlocked contract-only submission back to submitted', () => {
        cy.apiCreateAndSubmitContractOnlySubmission(stateUser()).then(
            (contract) => {
                const submissionSummaryUrl = `/submissions/${ContractSubmissionTypeRecord[contract.contractSubmissionType]}/${contract.id}`

                cy.logInAsCMSUser({ initialURL: submissionSummaryUrl })
                cy.unlockSubmission()
                cy.logOut()

                cy.logInAsAdminUser({ initialURL: submissionSummaryUrl })

                cy.findByRole('button', { name: 'Undo submission unlock' }).click()
                cy.findByRole('heading', {
                    name: 'Undo submission unlock',
                }).should('exist')
                cy.findByTestId('undoSubmissionUnlockReason').type(
                    'Undo unlock reason.'
                )
                cy.findByRole('button', { name: 'Undo submission unlock' }).click()

                cy.url({ timeout: 20_000 }).should(
                    'include',
                    submissionSummaryUrl
                )
                cy.findByTestId('submission-summary').should('exist')
                cy.findByText('Submitted').should('exist')
                cy.findByTestId('unlockedBanner').should('not.exist')
                cy.findByRole('button', { name: 'Undo unlock' }).should(
                    'not.exist'
                )
            }
        )
    })
})
