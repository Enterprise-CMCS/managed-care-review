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
        //      - Before interception: 01:06
        //      - After interception: 00:32
        //  Deployed run
        //      - Before interception: 02:51
        //      - After interception: 01:54

        // Then do Q&A stuff
        cy.interceptFeatureFlags({
            'cms-questions': true,
            'chip-only-form': true,
        })

        cy.apiCreateAndSubmitContractOnlySubmission().then(pkg => {
            cy.log(pkg.id)

            cy.log('FINISHED DIRECT API REQUESTS')
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

            // As a precaution we logg in as the CMS user before logging in as the Admin user so that the CMS user is
            // inserted into the database before trying to update its division
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

            // Log out
            cy.findByRole('button', { name: 'Sign out' }).click()
            cy.findByText(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )

            //TODO: Make assigning divisions a direct API request
            //Log in as Admin to the settings page
            cy.logInAsAdminUser({
                initialURL: `/settings`,
            })

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

        // cy.logInAsStateUser()
        //
        // // a submitted submission
        // cy.startNewContractOnlySubmissionWithBaseContract()
        //
        // cy.fillOutBaseContractDetails()
        // cy.navigateFormByButtonClick('CONTINUE')
        //
        // cy.findByRole('heading', {
        //     level: 2,
        //     name: /Contacts/,
        // }).should('exist')
        // cy.fillOutStateContact()
        // cy.navigateFormByButtonClick('CONTINUE')
        //
        // cy.findByRole('heading', { level: 2, name: /Supporting documents/ })
        // cy.navigateFormByButtonClick('CONTINUE')
        //
        // // Store submission name for reference later
        // let submissionId = ''
        // cy.location().then((fullUrl) => {
        //     const { pathname } = fullUrl
        //     const pathnameArray = pathname.split('/')
        //     submissionId = pathnameArray[2]
        // })
        // cy.findByRole('heading', { level: 2, name: /Review and submit/ })
        //
        // // Submit, sent to dashboard
        // cy.submitStateSubmissionForm()
        // cy.findByText('Dashboard').should('exist')
        // cy.findByText('Programs').should('exist')
        //
        // // View submission summary
        // cy.location().then((loc) => {
        //     expect(loc.search).to.match(/.*justSubmitted=*/)
        //     const submissionName = loc.search.split('=').pop()
        //     if (submissionName === undefined) {
        //         throw new Error('No submission name found' + loc.search)
        //     }
        //     cy.findByText(`${submissionName} was sent to CMS`).should('exist')
        //     cy.get('table')
        //         .findByRole('link', {name: submissionName})
        //         .should('exist')
        //     cy.findByRole('link', {name: submissionName}).click()
        //     cy.url({timeout: 10_000}).should('contain', submissionId)
        //     cy.findByTestId('submission-summary').should('exist')
        //     cy.findByRole('heading', {
        //         name: `Minnesota ${submissionName}`,
        //     }).should('exist')
        //
        //     // Find QA Link and click
        //     cy.findByRole('link', {name: /Q&A/}).click()
        //     cy.url({timeout: 10_000}).should(
        //         'contain',
        //         `${submissionId}/question-and-answers`
        //     )
        //
        //     // Heading is correct for Q&A main page
        //     cy.findByRole('heading', {
        //         name: `Minnesota ${submissionName}`,
        //     }).should('exist')
        //
        //     // Log out and log back in as cms user, visiting submission summary page,
        //     cy.findByRole('button', {name: 'Sign out'}).click()
        //     cy.findByText(
        //         'Medicaid and CHIP Managed Care Reporting and Review System'
        //     )
        //
        //     // As a precaution we logg in as the CMS user before logging in as the Admin user so that the CMS user is
        //     // inserted into the database before trying to update its division
        //     cy.logInAsCMSUser({
        //         initialURL: `/submissions/${submissionId}/question-and-answers`,
        //     })
        //
        //     cy.url({timeout: 10_000}).should(
        //         'contain',
        //         `${submissionId}/question-and-answers`
        //     )
        //
        //     cy.findByRole('heading', {
        //         name: `CMS ${submissionName}`,
        //     }).should('exist')
        //
        //     // Log out
        //     cy.findByRole('button', {name: 'Sign out'}).click()
        //     cy.findByText(
        //         'Medicaid and CHIP Managed Care Reporting and Review System'
        //     )
        //
        //     // Log in as Admin to the settings page
        //     cy.logInAsAdminUser({
        //         initialURL: `/settings`,
        //     })
        //
        //     // Update CMS user Zuko's division
        //     cy.assignDivisionToCMSUser({
        //         userEmail: 'zuko@example.com',
        //         division: 'DMCO'
        //     })
        //
        //     // Log out
        //     cy.findByRole('button', {name: 'Sign out'}).click()
        //     cy.findByText(
        //         'Medicaid and CHIP Managed Care Reporting and Review System'
        //     )
        //
        //     // Log back in as CMS user
        //     cy.logInAsCMSUser({
        //         initialURL: `/submissions/${submissionId}/question-and-answers`,
        //     })
        //
        //     cy.url({timeout: 10_000}).should(
        //         'contain',
        //         `${submissionId}/question-and-answers`
        //     )
        //
        //     cy.findByRole('heading', {
        //         name: `CMS ${submissionName}`,
        //     }).should('exist')
        //
        //     // Add a question
        //     cy.addQuestion({
        //         documentPath: 'documents/questions_for_submission.pdf'
        //     })
        //
        //     // Newly uploaded questions document should exist within DMCO section
        //     cy.findByTestId('dmco-qa-section').should('exist').within(() => {
        //         // Add timeout to findByText to allow time for generating document urls
        //         cy.findByText('questions_for_submission.pdf', {timeout: 5000}).should('exist')
        //     })
        //
        //     // Log out and log back in as cms user, visiting submission summary page,
        //     cy.findByRole('button', {name: 'Sign out'}).click()
        //     cy.findByText(
        //         'Medicaid and CHIP Managed Care Reporting and Review System'
        //     )
        //     cy.logInAsStateUser()
        //
        //     //Find submission on table and click
        //     cy.get('table')
        //         .findByRole('link', {name: submissionName})
        //         .should('exist')
        //     cy.findByRole('link', {name: submissionName}).click()
        //     cy.url({timeout: 10_000}).should('contain', submissionId)
        //     cy.findByTestId('submission-summary').should('exist')
        //     cy.findByRole('heading', {
        //         name: `Minnesota ${submissionName}`,
        //     }).should('exist')
        //
        //     // Navigate to QA page by sidenav bar link
        //     cy.findByRole('link', {name: /Q&A/}).click()
        //
        //     // Make sure Heading is correct with 'Upload questions' in addition to submission name
        //     cy.findByRole('heading', {
        //         name: `Minnesota ${submissionName}`,
        //     }).should('exist')
        //
        //     // Make sure question by CMS exists
        //     cy.findByTestId('dmco-qa-section').should('exist').within(() => {
        //         // Add timeout to findByText to allow time for generating document urls
        //         cy.findByText('questions_for_submission.pdf', {timeout: 5000}).should('exist')
        //     })
        //
        //     //Upload response
        //     cy.addResponse({documentPath: 'documents/response_to_questions_for_submission.pdf'})
        //
        //     // Newly uploaded response document should exist within DMCO section
        //     cy.findByTestId('dmco-qa-section').should('exist').within(() => {
        //         // Add timeout to findByText to allow time for generating document urls
        //         cy.findByText('response_to_questions_for_submission.pdf', {timeout: 5000}).should('exist')
        //     })
        // })
    })
})
