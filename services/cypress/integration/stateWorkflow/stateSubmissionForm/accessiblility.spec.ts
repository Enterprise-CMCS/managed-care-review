describe('state user in state submission form', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    // SKIPPED because we currently have a bug that looks related to https://github.com/mfrachet/cypress-audit/issues/136#issuecomment-1311236777
    // this started when we upgraded node and serverless and started default to ipv6 which prevented tests
    // current this keeps pa11y from running
    it.skip('can fill out contract only submission with no a11y errors', () => {
        // goal of this test is to check every single form page and navigation (going backwards, forwards or save as draft with new info)

        cy.logInAsStateUser()

        // Start a base contract only submissions
        cy.startNewContractOnlySubmissionWithBaseContract()


        cy.findByRole('heading', {
            level: 2,
            name: /Contract details/,
            timeout: 10_000,
        })

            // check contract details a11y
            cy.pa11y({
                hideElements: '.usa-step-indicator',
            actions: ['wait for element #form-guidance to be visible'],
                threshold: 6,
            hideElements: '.usa-step-indicator',
        })
        cy.deprecatedNavigateV1Form('BACK')
          // check submissionType a11y
          cy.pa11y({
            hideElements: '.usa-step-indicator',
        actions: ['wait for element #form-guidance to be visible'],
            threshold: 6,
        hideElements: '.usa-step-indicator',
    })

            cy.deprecatedNavigateV1Form('CONTINUE')
            cy.deprecatedNavigateV1Form('CONTINUE')

            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.fillOutStateContact()

           // check contacts a11y
           cy.pa11y({
            hideElements: '.usa-step-indicator',
        actions: ['wait for element #form-guidance to be visible'],
            threshold: 6,
        hideElements: '.usa-step-indicator',
    })

            cy.deprecatedNavigateV1Form('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })


            cy.deprecatedNavigateV1Form('CONTINUE')
            // skip documents page - that will be deleted soon
            cy.deprecatedNavigateV1Form('CONTINUE')

            // Check that we end up on Review and Submit
            cy.findByRole('heading', { level: 2, name: /Review and submit/ })

            // check review and submit a11y
            cy.pa11y({
                hideElements: '.usa-step-indicator',
            actions: ['wait for element #form-guidance to be visible'],
                threshold: 6,
            hideElements: '.usa-step-indicator',
        })
        })
    })
