import { stateUser } from '../../utils/apollo-test-utils'

describe('CMS user can view submission', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })

    it('and navigate to a specific submission from the submissions dashboard', () => {
        // state user adds a new package
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()
        cy.fillOutBaseContractDetails()
        cy.navigateContractForm('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Rate details/,
        }).should('exist')
        cy.fillOutNewRateCertification()
        cy.fillOutAdditionalActuaryContact()
        cy.navigateContractRatesForm('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Contacts/,
        }).should('exist')
        cy.fillOutStateContact()
        cy.navigateContractForm('CONTINUE')

        // store submission id for reference later
        let submissionId = ''
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            submissionId = pathnameArray[3]
        })

        // submit package
        cy.findByRole('heading', { level: 2, name: /Review and submit/ })
        cy.submitStateSubmissionForm()

        // store submission name for later
        cy.location().then((loc) => {
            expect(loc.search).to.match(/.*justSubmitted=*/)
            
            const urlParams = new URLSearchParams(loc.search)
            const submissionName = urlParams.get('justSubmitted')

            if (submissionName === undefined || submissionName === null) {
                throw new Error('No submission name found' + loc.search)
            }

            // sign out state user
            cy.logOut()
            //  sign in CMS user
            cy.logInAsCMSUser()
            cy.findByTestId('cms-dashboard-page').should('exist')
            cy.findByRole('table').should('exist')
            cy.findByText(submissionName).should('exist')
            // check the table of submissions

            // only one matching entry
            cy.get('table')
                .findAllByText(submissionName)
                .should('have.length', 1)

            // has proper row data
            cy.get('table')
                .should('exist')
                .findByText(submissionName)
                .parent()
                .findByTestId('submission-date')
                .should('not.be.empty')

            cy.get('table')
                .should('exist')
                .findByText(submissionName)
                .parent()
                .siblings('[data-testid="submission-status"]')
                .should('have.text', 'Submitted')

            cy.get('table')
                .contains('a', submissionName)
                .parents('tr')
                .findByTestId('submission-type')
                .should('have.text', 'Contract action and rate certification')

            cy.get('table')
                .contains('a', submissionName)
                .should('have.attr', 'href')

            // can navigate to submission summary  by clicking link
            cy.findByText(submissionName).should('exist').click()
            cy.url({ timeout: 10_000 }).should('contain', submissionId)
            cy.wait('@fetchContractQuery', { timeout: 20_000 })
            cy.findByTestId('submission-summary').should('exist')
            // ensure download link text is present
            cy.contains('a', /download contract documents \(2 files\)/i)
                .should('be.visible')
                .and('have.attr', 'href')
                .then((href) => {
                    expect(href).to.match(/\/zips\/contracts\/[^/]+\/[^/]+\.zip(\?|$)/)
                })
            cy.contains('a', /download rate documents \(2 files\)/i)
                .should('be.visible')
                .and('have.attr', 'href')
                .then((href) => {
                    expect(href).to.match(/\/zips\/rates\/[^/]+\/[^/]+\.zip(\?|$)/)
                })

            // No document dates or other fields are undefined
            cy.findByText('N/A').should('not.exist')

            // Double check we do not show any missing field text. This UI is not used for submitted packages
           cy.findByText(/You must provide this information/).should('not.exist')

        })
    })

    it('and navigate to a specific EQRO submission from the submission dashboard', () => {
        cy.interceptFeatureFlags({
            'eqro-submissions': true,
        })

        cy.apiCreateAndSubmitEQROSubmission(stateUser()).then(contract => {
            const latestSubmission = contract.packageSubmissions[0]
            const contractName = latestSubmission.contractRevision.contractName

            cy.logInAsCMSUser()

            cy.findByRole('link', { name: contractName}).should('exist').click()

            cy.wait('@fetchContractWithQuestionsQuery', { timeout: 20_000 })
 
            cy.findByRole('heading', { name: contractName, level: 2 })
            // ensure download link text is present
            cy.contains('a', /download contract documents \(1 file\)/i)
            .should('be.visible')
            .and('have.attr', 'href')
            .then((href) => {
                expect(href).to.match(/\/zips\/contracts\/[^/]+\/[^/]+\.zip(\?|$)/)
            })

            //TODO: Add assertions for review determination once that is added.
        })
    })

    it('and can approve a submission via releasing it to the state', () => {
        cy.interceptFeatureFlags({
            '438-attestation': true,
            'hide-supporting-docs-page': true,
            'dsnp':true
        })
        // state user adds a new package
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()
        cy.fillOutBaseContractDetails()
        cy.navigateContractForm('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Rate details/,
        }).should('exist')
        cy.fillOutNewRateCertification()
        cy.fillOutAdditionalActuaryContact()
        cy.navigateContractRatesForm('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Contacts/,
        }).should('exist')
        cy.fillOutStateContact()
        cy.navigateContractForm('CONTINUE')

        // store submission id for reference later
        let submissionId = ''
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            submissionId = pathnameArray[3]
        })

        // submit package
        cy.findByRole('heading', { level: 2, name: /Review and submit/ })
        cy.submitStateSubmissionForm()

        // store submission name for later
        cy.location().then((loc) => {
            expect(loc.search).to.match(/.*justSubmitted=*/)
            
            const urlParams = new URLSearchParams(loc.search)
            const submissionName = urlParams.get('justSubmitted')

            if (submissionName === undefined || submissionName === null) {
                throw new Error('No submission name found' + loc.search)
            }

            // sign out state user
            cy.logOut()
            //  sign in CMS user
            cy.logInAsCMSUser()
            cy.findByTestId('cms-dashboard-page').should('exist')
            cy.findByRole('table').should('exist')
            cy.findByText(submissionName).should('exist')
            // check the table of submissions

          
            // can navigate to submission summary  by clicking link
            cy.findByText(submissionName).should('exist').click()
            cy.url({ timeout: 10_000 }).should('contain', submissionId)
            cy.wait('@fetchContractQuery', { timeout: 20_000 })
            cy.findByTestId('submission-summary').should('exist')

            cy.findByRole('link', {name: 'Released to state'}).should('exist').click()
            cy.findByTestId('date-picker-external-input').type('11/11/2024')
            cy.findByRole('button', {name: 'Released to state'}).should('exist').click()
            cy.findByTestId('submissionApprovedBanner').should('exist')
        })
    })
})
