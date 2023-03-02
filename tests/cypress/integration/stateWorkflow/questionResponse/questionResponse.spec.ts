import {aliasQuery} from '../../../utils/graphql-test-utils';

describe('Q&A', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.intercept('POST', '*/graphql', (req) => {
            aliasQuery(req, 'createQuestion')
            aliasQuery(req, 'fetchHealthPlanPackageWithQuestions')
        })
    })

    it('can add and display cms questions', () => {
        cy.interceptFeatureFlags({
            'rate-cert-assurance': true,
            'cms-questions': true
        })
        cy.logInAsStateUser()

        // a submitted submission
        cy.startNewContractOnlySubmissionWithBaseContract()

        cy.fillOutBaseContractDetails()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Contacts/,
        }).should('exist')
        cy.fillOutStateContact()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', { level: 2, name: /Supporting documents/ })
        cy.navigateFormByButtonClick('CONTINUE')

        // Store submission name for reference later
        let submissionId = ''
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            submissionId = pathnameArray[2]
        })
        cy.findByRole('heading', { level: 2, name: /Review and submit/ })

        // Submit, sent to dashboard
        cy.submitStateSubmissionForm()
        cy.findByText('Dashboard').should('exist')
        cy.findByText('Programs').should('exist')

        // View submission summary
        cy.location().then((loc) => {
            expect(loc.search).to.match(/.*justSubmitted=*/)
            const submissionName = loc.search.split('=').pop()
            if (submissionName === undefined) {
                throw new Error('No submission name found' + loc.search)
            }
            cy.findByText(`${submissionName} was sent to CMS`).should('exist')
            cy.get('table')
                .findByRole('link', { name: submissionName })
                .should('exist')
            cy.findByRole('link', { name: submissionName }).click()
            cy.url({ timeout: 10_000 }).should('contain', submissionId)
            cy.findByTestId('submission-summary').should('exist')
            cy.findByRole('heading', {
                name: `Minnesota ${submissionName}`,
            }).should('exist')

            // Find QA Link and click
            cy.findByRole('link', { name: /Q&A/ }).click()
            cy.url({ timeout: 10_000 }).should('contain', `${submissionId}/question-and-answers`)

            // Make sure Heading is correct with 'Upload questions' in addition to submission name
            cy.findByRole('heading', {
                name: `Minnesota ${submissionName} Upload questions`,
            }).should('exist')

            // Log out and log back in as cms user, visiting submission summary page,
            cy.findByRole('button', { name: 'Sign out' }).click()
            cy.findByText(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )
            cy.logInAsCMSUser({ initialURL: `/submissions/${submissionId}/question-and-answers` })

            cy.findByRole('heading', {
                name: `CMS ${submissionName} Upload questions`,
            }).should('exist')

            // Add second question
            cy.addQuestion({
                documentPath: 'documents/trussel-guide.pdf'
            })

            // Newly uploaded questions document should exist within DMCO section
            cy.findByTestId('dmco-qa-section').should('exist').within(() => {
                // Add timeout to findByText to allow time for generating document urls
                cy.findByText('trussel-guide.pdf',  { timeout: 5000 }).should('exist')
            })

            // Add a second question
            cy.addQuestion({
                documentPath: 'documents/testing.csv'
            })

            // Newly uploaded questions document should exist within DMCO section
            cy.findByTestId('dmco-qa-section').should('exist').within(() => {
                // Add timeout to findByText to allow time for generating document urls
                cy.findByText('testing.csv',  { timeout: 5000 }).should('exist')
            })

            // Find submission summary link and click
            cy.findByRole('link', { name: /Submission summary/ }).click()
            cy.url({ timeout: 10_000 }).should('contain', submissionId)

            // Find back to dashboard link and click
            cy.findByText('Back to dashboard').should('exist').click()
            cy.url({ timeout: 10_000 }).should('contain', 'dashboard')

            cy.get('table')
                .findByRole('link', { name: submissionName })
                .should('exist')
        })
    })
})
