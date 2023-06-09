<<<<<<< HEAD
import { aliasQuery } from '../../../utils/graphql-test-utils'

=======
import { stateUser, cmsUser } from '../../../utils/apollo-test-utils';
>>>>>>> c628e9304d35d6e70f326996a9ba8bbe393d3265
describe('Q&A', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })

    it('can add questions and responses', () => {
        cy.interceptFeatureFlags({
            'cms-questions': true,
            'chip-only-form': true,
        })

        // Assign Division to CMS user zuko
        cy.apiAssignDivisionToCMSUser(cmsUser(), 'DMCO').then(() => {

            // Create a new submission
            cy.apiCreateAndSubmitContractOnlySubmission(stateUser()).then(pkg => {
                // Log in as CMS user and upload question
                cy.logInAsCMSUser({
                    initialURL: `/submissions/${pkg.id}/question-and-answers`,
                })

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

                cy.findByText('Start new submission').should('exist')

                cy.visit(`/submissions/${pkg.id}`)
                cy.wait('@fetchHealthPlanPackageWithQuestionsQuery')
                // cy.url({ timeout: 10_000 }).should('contain', pkg.id)

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

<<<<<<< HEAD
            // Update CMS user Zuko's division
            cy.assignDivisionToCMSUser({
                userEmail: 'zuko@example.com',
                division: 'DMCO',
            })

            // Log out
            cy.findByRole('button', { name: 'Sign out' }).click()
            cy.findByText(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )

            // Log back in as CMS user
            cy.logInAsCMSUser({
                initialURL: `/submissions/${submissionId}/question-and-answers`,
            })

            cy.url({ timeout: 10_000 }).should(
                'contain',
                `${submissionId}/question-and-answers`
            )

            cy.findByRole('heading', {
                name: `CMS ${submissionName}`,
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
                        timeout: 5000,
                    }).should('exist')
                })

            // Log out and log back in as cms user, visiting submission summary page,
            cy.findByRole('button', { name: 'Sign out' }).click()
            cy.findByText(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )
            cy.logInAsStateUser()

            //Find submission on table and click
            cy.get('table')
                .findByRole('link', { name: submissionName })
                .should('exist')
            cy.findByRole('link', { name: submissionName }).click()
            cy.url({ timeout: 10_000 }).should('contain', submissionId)
            cy.findByTestId('submission-summary').should('exist')
            cy.findByRole('heading', {
                name: `Minnesota ${submissionName}`,
            }).should('exist')

            // Navigate to QA page by sidenav bar link
            cy.findByRole('link', { name: /Q&A/ }).click()

            // Make sure Heading is correct with 'Upload questions' in addition to submission name
            cy.findByRole('heading', {
                name: `Minnesota ${submissionName}`,
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
                    cy.findByText('response_to_questions_for_submission.pdf', {
                        timeout: 5000,
                    }).should('exist')
                })
=======
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
>>>>>>> c628e9304d35d6e70f326996a9ba8bbe393d3265
        })
    })
})
