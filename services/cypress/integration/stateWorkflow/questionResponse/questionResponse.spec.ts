import { stateUser, cmsUser } from '../../../utils/apollo-test-utils'
describe('Q&A', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })

    it('can add questions and responses', () => {
        // Assign Division to CMS user zuko
        cy.apiAssignDivisionToCMSUser(cmsUser(), 'DMCO').then(() => {
            // Create a new submission
            cy.apiCreateAndSubmitContractOnlySubmission(stateUser()).then(
                (contract) => {
                    // Log in as CMS user and upload question
                    cy.logInAsCMSUser({
                        initialURL: `/submissions/${contract.id}/question-and-answers`,
                    })

                    cy.url({ timeout: 10_000 }).should(
                        'contain',
                        `${contract.id}/question-and-answers`
                    )

                    cy.findByRole('link', {
                        name: `Submission summary`,
                    }).should('exist')

                    // Add a question
                    cy.addQuestion({
                        documentPath: 'documents/questions_for_submission.pdf',
                    })

                    // Newly uploaded questions document should exist within DMCO section
                    cy.findByTestId('dmco-qa-section')
                        .should('exist')
                        .within(() => {
                            // Add timeout to findByText to allow time for generating document urls
                            cy.findByText('questions_for_submission.pdf', {
                                timeout: 5_000,
                            }).should('exist')
                        })

                    // Log out and log back in as State user, visiting submission summary page
                    cy.logOut()

                    cy.logInAsStateUser()

                    cy.visit(`/submissions/${contract.id}`)

                    cy.findByTestId('submission-summary').should('exist')
                    cy.findByRole('link', {
                        name: `Submission summary`,
                    }).should('exist')

                    // Find QA Link and click
                    cy.findByRole('link', { name: /Contract questions/ }).click()
                    cy.url({ timeout: 10_000 }).should(
                        'contain',
                        `${contract.id}/question-and-answers`
                    )

                    // Make sure Heading is correct with 'Upload questions' in addition to submission name
                    cy.findByRole('link', {
                        name: `Submission summary`,
                    }).should('exist')

                    // Newly uploaded questions document should exist within DMCO section
                    cy.findByTestId('dmco-qa-section')
                        .should('exist')
                        .within(() => {
                            // Add timeout to findByText to allow time for generating document urls
                            cy.findByText('questions_for_submission.pdf', {
                                timeout: 5_000,
                            }).should('exist')
                        })

                    cy.addResponse({
                        documentPath:
                            'documents/response_to_questions_for_submission.pdf',
                    })

                    // Newly uploaded response document should exist within DMCO section
                    cy.findByTestId('dmco-qa-section')
                        .should('exist')
                        .within(() => {
                            // Add timeout to findByText to allow time for generating document urls
                            cy.findByText(
                                'response_to_questions_for_submission.pdf',
                                { timeout: 5_000 }
                            ).should('exist')
                        })


                    // No document dates or other fields are undefined
                    cy.findByText('N/A').should('not.exist')
                }
            )
        })
    })
})
