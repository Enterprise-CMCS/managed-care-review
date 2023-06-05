import { aliasQuery } from '../../../utils/graphql-test-utils'
describe('Q&A', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.intercept('POST', '*/graphql', (req) => {
            aliasQuery(req, 'fetchHealthPlanPackageWithQuestions')
        })
    })

    it('can add questions and responses', () => {
        //NOTE: Record test time
        //  Local run
        //      - Before direct api request: 01:06
        //      - After direct api request: 00:29
        //  Deployed local run using review app
        //      - Before direct api request: 02:51
        //      - After direct api request: 01:54
        //  Deployed CI run
        //      - Before direct api request: 3:52
        //      - After direct api request: 2:35

        // Then do Q&A stuff
        cy.interceptFeatureFlags({
            'cms-questions': true,
            'chip-only-form': true,
        })

        cy.apiCreateAndSubmitContractOnlySubmission().then(pkg => {
            cy.logInAsStateUser()
            cy.visit(`/submissions/${pkg.id}`)

            cy.url({ timeout: 10_000 }).should('contain', pkg.id)
            cy.findByTestId('submission-summary').should('exist')
            cy.findByRole('link', {
                name: `Submission summary`,
            }).should('exist')

            // Find QA Link and click
            cy.findByRole('link', { name: /Q&A/ }).click()
            cy.url({ timeout: 10_000 }).should(
                'contain',
                `${pkg.id}/question-and-answers`
            )

            // Heading is correct for Q&A main page
            cy.findByRole('link', {
                name: `Submission summary`,
            }).should('exist')

            // Log out and log back in as cms user, visiting submission summary page,
            cy.findByRole('button', { name: 'Sign out' }).click()
            cy.findByText(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )

            // // As a precaution we logg in as the CMS user before logging in as the Admin user so that the CMS user is
            // // inserted into the database before trying to update its division
            // cy.logInAsCMSUser({
            //     initialURL: `/submissions/${pkg.id}/question-and-answers`,
            // })
            // cy.wait('@fetchHealthPlanPackageWithQuestionsQuery', { timeout: 20000 })
            //
            // cy.url({ timeout: 10_000 }).should(
            //     'contain',
            //     `${pkg.id}/question-and-answers`
            // )
            //
            // cy.findByRole('link', {
            //     name: `Submission summary`,
            // }).should('exist')
            //
            // // Log out
            // cy.findByRole('button', { name: 'Sign out' }).click()
            // cy.findByText(
            //     'Medicaid and CHIP Managed Care Reporting and Review System'
            // )

            //Assign Division to CMS user zuko
            cy.apiAssignDivisionToCMSUser('zuko@example.com', 'DMCO').then(() => {
                // Log back in as CMS user
                cy.logInAsCMSUser({
                    initialURL: `/submissions/${pkg.id}/question-and-answers`,
                })
                cy.wait('@fetchHealthPlanPackageWithQuestionsQuery', { timeout: 20000 })

                cy.url({ timeout: 10_000 }).should(
                    'contain',
                    `${pkg.id}/question-and-answers`
                )

                cy.findByRole('link', {
                    name: `Submission summary`,
                }).should('exist')

                // Add a question
                cy.addQuestion({
                    documentPath:
                        'documents/questions_for_submission.pdf',
                })

                // Newly uploaded questions document should exist within DMCO section
                cy.findByTestId('dmco-qa-section')
                    .should('exist')
                    .within(() => {
                        // Add timeout to findByText to allow time for generating document urls
                        cy.findByText('questions_for_submission.pdf', {
                            timeout: 5000,
                        }).should('exist')
                    })

                // Log out and log back in as cms user, visiting submission summary page,
                cy.findByRole('button', { name: 'Sign out' }).click()
                cy.findByText(
                    'Medicaid and CHIP Managed Care Reporting and Review System'
                )

                cy.logInAsStateUser()
                cy.wait(1500)

                cy.visit(`/submissions/${pkg.id}`)

                cy.url({ timeout: 10_000 }).should('contain', pkg.id)
                cy.findByTestId('submission-summary').should('exist')
                cy.findByRole('link', {
                    name: `Submission summary`,
                }).should('exist')

                // Find QA Link and click
                cy.findByRole('link', { name: /Q&A/ }).click()
                cy.url({ timeout: 10_000 }).should(
                    'contain',
                    `${pkg.id}/question-and-answers`
                )

                // Make sure Heading is correct with 'Upload questions' in addition to submission name
                cy.findByRole('link', {
                    name: `Submission summary`,
                }).should('exist')

                // Make sure question by CMS exists
                cy.findByTestId('dmco-qa-section')
                    .should('exist')
                    .within(() => {
                        // Add timeout to findByText to allow time for generating document urls
                        cy.findByText('questions_for_submission.pdf', {
                            timeout: 5000,
                        }).should('exist')
                    })

                //Upload response
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
                            { timeout: 5000 }
                        ).should('exist')
                    })
            })
        })
    })
})
