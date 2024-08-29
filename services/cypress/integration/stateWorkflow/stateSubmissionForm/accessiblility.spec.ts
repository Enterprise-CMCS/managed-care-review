import { stateUser } from '../../../utils/apollo-test-utils';

describe('state user in state submission form', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    it('has not a11y errors with submission form and and form erros', () => {
        // goal of this test is to check every single form page and navigation (going backwards, forwards or save as draft with new info)
        cy.interceptFeatureFlags({'438-attestation': true})
        cy.logInAsStateUser()

        // Inject the axe run-time
        cy.injectAxe()

        // Start a base contract only submissions
        cy.findByTestId('state-dashboard-page').should('exist')
        cy.findByRole('link', { name: 'Start new submission' }).click()

        // Check accessibility on Submission type page
        cy.findByRole('heading', { level: 1, name: /New submission/ })
        cy.findByRole('button', {
            name: 'Continue',
        }).should('not.have.attr', 'aria-disabled')
        cy.findByRole('button', {
            name: 'Continue',
        }).safeClick()
        cy.checkA11yWithSection508()

        cy.fillOutContractActionAndRateCertification()
        cy.deprecatedNavigateV1Form('CONTINUE_FROM_START_NEW')

        cy.findByRole('heading', { level: 2, name: /Contract details/ })
        cy.findByRole('button', {
            name: 'Continue',
        }).should('not.have.attr', 'aria-disabled')
        cy.findByRole('button', {
            name: 'Continue',
        }).safeClick()
        cy.checkA11yWithSection508()

        cy.location().then((fullUrl) => {
            const submissionURL = fullUrl.toString().replace(
                'edit/contract-details',
                ''
            )

            // Check accessibility on rate details page
            cy.navigateFormByDirectLink(`${submissionURL}edit/rate-details`)
            cy.findByRole('radiogroup', {
                name: /Was this rate certification included with another submission?/,
            })
                .should('exist')
                .within(() => {
                    cy.findByText('No, this rate certification was not included with any other submissions').click()
                })
            cy.injectAxe()
            cy.findByRole('button', {
                name: 'Continue',
            }).should('not.have.attr', 'aria-disabled')
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()
            cy.checkA11yWithSection508()

            //Check accessibility on contacts page
            cy.navigateFormByDirectLink(`${submissionURL}edit/contacts`)
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.injectAxe()
            cy.findByRole('button', {
                name: 'Continue',
            }).should('not.have.attr', 'aria-disabled')
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()
            cy.checkA11yWithSection508()

            //Check accessibility on documents page
            cy.navigateFormByDirectLink(`${submissionURL}edit/documents`)
            cy.findByRole('heading', { level: 2, name: /Supporting documents/ })
            cy.injectAxe()
            cy.findByRole('button', {
                name: 'Continue',
            }).should('not.have.attr', 'aria-disabled')
            cy.findByRole('button', {
                name: 'Continue',
            }).safeClick()
            cy.checkA11yWithSection508()

            //Check accessibility on review and submit page
            cy.navigateFormByDirectLink(`${submissionURL}edit/review-and-submit`)
            cy.findByRole('heading', { level: 2, name: /Review and submit/ })
            cy.injectAxe()
            cy.checkA11yWithSection508()

            //Check the dashboard
            cy.navigateContractRatesForm('SAVE_DRAFT', false)
            cy.checkA11yWithSection508()
        })
    })

    it('has no errors on CMS dashboard', () => {
        cy.apiCreateAndSubmitContractWithRates(stateUser()).then(() => {
            cy.logInAsCMSUser()
            cy.injectAxe()
            //check submissions tab
            cy.checkA11yWithSection508()

            //check rate reviews tab
            cy.findByRole('tab', { name: 'Rate reviews' }).should('exist').click()
            cy.checkA11yWithSection508()
        })
    })
})
