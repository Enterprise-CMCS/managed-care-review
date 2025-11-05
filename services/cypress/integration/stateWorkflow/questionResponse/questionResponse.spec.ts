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
            cy.apiCreateAndSubmitContractWithRates(stateUser()).then(
                (contract) => {
                    // Log in as CMS user and upload question
                    cy.logInAsCMSUser({
                        initialURL: `/submissions/${contract.contractSubmissionType}/${contract.id}/question-and-answers`,
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

                    // Newly uploaded questions document should exist within your section
                    cy.findByRole('heading', {name: 'Your division\'s questions'})
                        .should('exist')
                        .parent()
                        .parent()
                        .parent()
                        .within(() => {
                            // Add timeout to findByText to allow time for generating document urls
                            cy.findByText('questions_for_submission.pdf', {
                                timeout: 5_000,
                            }).should('exist')
                        })

                    // Log out and log back in as State user, visiting submission summary page
                    cy.logOut()

                    cy.logInAsStateUser()

                    cy.visit(`/submissions/${contract.contractSubmissionType}/${contract.id}`)

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
                    cy.findByRole('heading', {name: 'Outstanding questions'})
                        .should('exist')
                        .parent()
                        .parent()
                        .parent()
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
                    cy.findByRole('heading', {name: 'Answered questions'})
                        .should('exist')
                        .parent()
                        .parent()
                        .parent()
                        .within(() => {
                            // Add timeout to findByText to allow time for generating document urls
                            cy.findByText(
                                'response_to_questions_for_submission.pdf',
                                { timeout: 5_000 }
                            ).should('exist')
                        })


                    // No document dates or other fields are undefined
                    cy.findByText('N/A').should('not.exist')

                    // Add rate questions
                    // Navigate to rate as state user
                    cy.findByRole('link', { name: /Rate questions: SNBC/}).should('exist').click()

                    // Get the URL to use for CMS user
                    cy.url().then(rateQAUrl => {
                        cy.url().should('include', '/rates/')

                        // Log out as State user
                        cy.logOut()

                        // Log in as CMS user with rate QA url
                        cy.logInAsCMSUser({
                            initialURL: rateQAUrl,
                        })

                        cy.findByRole('heading', { name: /Your division's questions/}).should('exist')

                        // Add new rate question
                        cy.addQuestion({
                            documentPath: 'documents/questions_for_rate.pdf',
                        })

                        // Newly uploaded questions document should exist within your division section
                        cy.findByTestId('usersDivisionQuestions')
                            .should('exist')
                            .within(() => {
                                // Add timeout to findByText to allow time for generating document urls
                                cy.findByText('questions_for_rate.pdf', {
                                    timeout: 5_000,
                                }).should('exist')
                            })

                        // Log out as CMS
                        cy.logOut()

                        // Log in as state user
                        cy.logInAsStateUser()

                        // View rate QA page
                        cy.visit(rateQAUrl)

                        // Check that the question exists
                        cy.findByTestId('outstandingQuestions')
                            .should('exist')
                            .within(() => {
                                // Add timeout to findByText to allow time for generating document urls
                                cy.findByText('questions_for_rate.pdf', {
                                    timeout: 5_000,
                                }).should('exist')
                            })

                        // Add response to new rate
                        cy.addResponse({
                            documentPath:
                                'documents/response_to_questions_for_rate.pdf',
                        })

                        // Newly uploaded response document should exist within DMCO section
                        cy.findByTestId('answeredQuestions')
                            .should('exist')
                            .within(() => {
                                // Add timeout to findByText to allow time for generating document urls
                                cy.findByText(
                                    'response_to_questions_for_rate.pdf',
                                    { timeout: 5_000 }
                                ).should('exist')
                            })
                    })
                }
            )
        })
    })
})
