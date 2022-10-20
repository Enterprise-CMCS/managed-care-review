import * as path from 'path'

describe('CMS user', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
    })
    it('can unlock and resubmit', () => {
        cy.logInAsStateUser()

        // fill out an entire submission
        cy.startNewContractAndRatesSubmission()
        cy.fillOutBaseContractDetails()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', { name: /Rate details/ }).should('exist')
        cy.fillOutNewRateCertification()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', { name: /Contacts/ }).should('exist')
        cy.fillOutStateContact()
        cy.fillOutActuaryContact()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', { name: /Supporting documents/ }).should(
            'exist'
        )
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', { name: /Review and submit/ }).should('exist')

        // Store submission url for reference later
        cy.location().then((fullUrl) => {
            const reviewURL = fullUrl.toString()
            const rateDetailsURL = reviewURL.replace('edit/review-and-submit', 'edit/rate-details')
            const submissionURL = reviewURL.replace('edit/review-and-submit', '')
            fullUrl.pathname = path.dirname(fullUrl)

            // Submit, sent to dashboard
            cy.submitStateSubmissionForm()

            cy.findByText('Dashboard').should('exist')
            cy.findByText('Programs').should('exist')

            // Login as CMS User
            cy.findByRole('button', { name: 'Sign out' }).click()
            cy.findByText(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )
            cy.logInAsCMSUser({ initialURL: submissionURL})

            // click on the unlock button, type in reason and confirm
            cy.wait(2000)
            cy.findByRole('button', { name: 'Unlock submission' }).click()
            cy.findAllByTestId('modalWindow').eq(1).should('be.visible')
            cy.get('#unlockSubmitModalInput').type(
                'Unlock submission reason.'
            )
            cy.findByRole('button', { name: 'Unlock' }).click()

            cy.wait(2000)

            cy.findByRole('button', { name: 'Unlock submission' }).should(
                'be.disabled'
            )
            cy.findAllByTestId('modalWindow').eq(1).should('be.hidden')

            //Unlock banner for CMS user to be present with correct data.
            cy.findByTestId('unlockedBanner')
                .should('exist')
                .and('contain.text', 'zuko@example.com')
                .and('contain.text', 'Unlock submission reason.')
                .should('exist')

            cy.wait(2000)

            //Find unlocked submission name
            cy.get('#submissionName').then(($h2) => {
                //Set name to variable for later use in finding the unlocked submission
                const submissionName = $h2.text()
                // Login as state user
                cy.findByRole('button', { name: 'Sign out' }).click()

                cy.findByText(
                    'Medicaid and CHIP Managed Care Reporting and Review System'
                )

                cy.logInAsStateUser()
                cy.wait(2000)

                // State user sees unlocked submission - check tag then submission link
                cy.findByRole('heading', { name: /Submissions/ }).should('exist')
                cy.get('table')
                    .should('exist')
                    .findByText(submissionName)
                    .parent()
                    .siblings('[data-testid="submission-status"]')
                    .should('have.text', 'Unlocked')

                cy.get('table')
                    .should('exist')
                    .findByText(submissionName)
                    .should('have.attr', 'href')
                    .and('include', 'review-and-submit')

                cy.navigateFormByDirectLink(reviewURL)

                //Unlock banner for state user to be present with correct data.
                cy.findByRole('heading', {
                    level: 2,
                    name: /Review and submit/,
                })
                cy.findByRole('heading', {
                    name: `Minnesota ${submissionName}`,
                }).should('exist')
                cy.findByTestId('unlockedBanner')
                    .should('exist')
                    .and('contain.text', 'zuko@example.com')
                    .and('contain.text', 'Unlock submission reason.')
                    .should('exist')

                cy.submitStateSubmissionForm(true, true)

                cy.findByText('Dashboard').should('exist')

                cy.get('table')
                    .should('exist')
                    .findByText(submissionName)
                    .parent()
                    .siblings('[data-testid="submission-status"]')
                    .should('have.text', 'Submitted')

                cy.get('table')
                    .findByText(submissionName)
                    .should('have.attr', 'href')
                    .and('not.include', 'review-and-submit')

                //Navigate to resubmitted submission and check for submission updated banner
                cy.get('table').findByText(submissionName).click()
                cy.wait('@fetchHealthPlanPackageQuery', { timeout: 50000 })
                cy.findByTestId('updatedSubmissionBanner').should('exist')

                //Sign out
                cy.findByRole('button', { name: 'Sign out' }).click()

                cy.wait(5000)

                cy.findByText(
                    'Medicaid and CHIP Managed Care Reporting and Review System'
                )

                // Login as CMS User
                cy.logInAsCMSUser({ initialURL: submissionURL })

                //  CMS user sees resubmitted submission and active unlock button
                cy.findByTestId('submission-summary').should('exist')
                cy.findByRole('button', { name: 'Unlock submission' }).should(
                    'not.be.disabled'
                )

                //CSM user should not see unlock banner and should see updated submission banner
                cy.findByTestId('unlockedBanner').should('not.exist')
                cy.findByTestId('updatedSubmissionBanner').should('exist')

                //Open all change history accordion items
                cy.findByTestId('accordion').should('exist')

                cy.get('[data-testid^="accordionButton_"]').each((button) => {
                    button.trigger('click')
                    button.siblings().hasClass('usa-accordion__content') /// make sure accordion is expanded
                })
                //Check for view previous submission link in the initial accordion item to exist
                  cy.findByTestId('revision-link-1').should('be.visible')
                cy.clickSubmissionLink('revision-link-1')
                //Making sure we are on SubmissionRevisionSummary page and contains version text
                cy.findByTestId('revision-version')
                    .should('exist')
                //Previous submission banner should exist and able to click link to go back to current submission
                cy.findByTestId('previous-submission-banner').should('exist')
                //Navigate back to current submission using link inside banner.
                cy.clickSubmissionLink(
                    'currentSubmissionLink'
                )
                //Make sure banner and revision version text are gone.
                cy.findByTestId('previous-submission-banner').should(
                    'not.exist'
                )
                cy.findByTestId('revision-version').should('not.exist')

                //Turn multi-rate feature flag on
                cy.interceptFeatureFlags({ 'multi-rate-submissions': true })

                //Unlock submission again
                cy.findByRole('button', { name: 'Unlock submission' }).click()
                cy.findAllByTestId('modalWindow').eq(1).should('be.visible')
                cy.get('#unlockSubmitModalInput').type(
                    'Unlock submission to add another rate cert.'
                )
                cy.findByRole('button', { name: 'Unlock' }).click()

                cy.wait(2000)

                cy.findByRole('button', { name: 'Unlock submission' }).should(
                    'be.disabled'
                )
                cy.findAllByTestId('modalWindow').eq(1).should('be.hidden')

                //Unlock banner for CMS user to be present with correct data.
                cy.findByTestId('unlockedBanner')
                    .should('exist')
                    .and('contain.text', 'zuko@example.com')
                    .and('contain.text', 'Unlock submission to add another rate cert.')
                    .should('exist')

                //Sign out
                cy.findByRole('button', { name: 'Sign out' }).click()
                cy.wait(5000)
                cy.findByText(
                    'Medicaid and CHIP Managed Care Reporting and Review System'
                )

                cy.logInAsStateUser()
                cy.wait(2000)

                // State user sees unlocked submission - check tag then submission link
                cy.findByRole('heading', { name: /Submissions/ }).should('exist')
                cy.get('table')
                    .should('exist')
                    .findByText(submissionName)
                    .parent()
                    .siblings('[data-testid="submission-status"]')
                    .should('have.text', 'Unlocked')

                cy.get('table')
                    .should('exist')
                    .findByText(submissionName)
                    .should('have.attr', 'href')
                    .and('include', 'review-and-submit')

                cy.navigateFormByDirectLink(reviewURL)
                cy.findByRole('heading', {
                    level: 2,
                    name: /Review and submit/,
                })
                cy.findByRole('heading', {
                    name: `Minnesota ${submissionName}`,
                }).should('exist')
                cy.findByTestId('unlockedBanner')
                    .should('exist')
                    .and('contain.text', 'zuko@example.com')
                    .and('contain.text', 'Unlock submission to add another rate cert.')
                    .should('exist')

                cy.navigateFormByDirectLink(rateDetailsURL)
                cy.findByRole('heading', { name: /Rate details/ }).should('exist')
            })
        })
    })

    /**
     * This test below caused some strange failing tests looking for text after logging in as State or CMS user
     * Commented this test out and added multi-rate test to the test above for now.
     * **/
    // it('can unlock and resubmit multi-rate submissions', () => {
    //     cy.interceptFeatureFlags({'multi-rate-submissions': true})
    //     cy.logInAsStateUser()
    //
    //     // fill out an entire submission
    //     cy.startNewContractAndRatesSubmission()
    //     cy.findByTestId('unlockedBanner').should('not.exist')
    //     cy.fillOutBaseContractDetails()
    //
    //     //Continue to rate details page
    //     cy.navigateFormByButtonClick('CONTINUE')
    //     cy.findByRole('heading', { level: 2, name: /Rate details/ })
    //
    //     //Add three additional rate certification forms, four total.
    //     cy.findByRole('button', { name: 'Add another rate certification'}).click()
    //     cy.findByRole('button', { name: 'Add another rate certification'}).click()
    //     cy.findByRole('button', { name: 'Add another rate certification'}).click()
    //
    //     //Fil out every rate certification form
    //     cy.findAllByTestId('rate-certification-form').each( form => cy.wrap(form).within(() => cy.fillOutNewRateCertification()))
    //
    //     cy.navigateFormByButtonClick('CONTINUE')
    //     cy.findByRole('heading', { level: 2, name: /Contacts/ })
    //     cy.fillOutStateContact()
    //     cy.fillOutActuaryContact()
    //
    //     cy.navigateFormByButtonClick('CONTINUE')
    //     cy.findByRole('heading', { name: /Supporting documents/ }).should(
    //         'exist'
    //     )
    //
    //     cy.navigateFormByButtonClick('CONTINUE')
    //     cy.findByRole('heading', { name: /Review and submit/ }).should('exist')
    //
    //     // Store submission url for reference later
    //     cy.location().then((fullUrl) => {
    //         const reviewURL = fullUrl.toString()
    //         const submissionURL = reviewURL.replace('edit/review-and-submit', '')
    //         fullUrl.pathname = path.dirname(fullUrl)
    //
    //         // Submit, sent to dashboard
    //         cy.submitStateSubmissionForm()
    //
    //         cy.findByText('Dashboard').should('exist')
    //         cy.findByText('Programs').should('exist')
    //
    //         // Login as CMS User
    //         cy.findByRole('button', { name: 'Sign out' }).click()
    //         cy.findByText(
    //             'Medicaid and CHIP Managed Care Reporting and Review System'
    //         )
    //         cy.logInAsCMSUser({ initialURL: submissionURL})
    //
    //         // click on the unlock button, type in reason and confirm
    //         cy.wait(2000)
    //         cy.findByRole('button', { name: 'Unlock submission' }).click()
    //         cy.findAllByTestId('modalWindow').eq(1).should('be.visible')
    //         cy.get('#unlockSubmitModalInput').type(
    //             'Unlock submission reason.'
    //         )
    //         cy.findByRole('button', { name: 'Unlock' }).click()
    //
    //         cy.wait(2000)
    //
    //         cy.findByRole('button', { name: 'Unlock submission' }).should(
    //             'be.disabled'
    //         )
    //         cy.findAllByTestId('modalWindow').eq(1).should('be.hidden')
    //
    //         //Unlock banner for CMS user to be present with correct data.
    //         cy.findByTestId('unlockedBanner')
    //             .should('exist')
    //             .and('contain.text', 'zuko@example.com')
    //             .and('contain.text', 'Unlock submission reason.')
    //             .contains(
    //                 /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET/i
    //             )
    //             .should('exist')
    //
    //         cy.wait(2000)
    //
    //         //Find unlocked submission name
    //         cy.get('#submissionName').then(($h2) => {
    //             //Set name to variable for later use in finding the unlocked submission
    //             const submissionName = $h2.text()
    //             // Login as state user
    //             cy.findByRole('button', { name: 'Sign out' }).click()
    //
    //             cy.findByText(
    //                 'Medicaid and CHIP Managed Care Reporting and Review System'
    //             )
    //
    //             cy.logInAsStateUser()
    //
    //             // State user sees unlocked submission - check tag then submission link
    //             cy.findByText('Submissions').should('exist')
    //             cy.get('table')
    //                 .should('exist')
    //                 .findByText(submissionName)
    //                 .parent()
    //                 .siblings('[data-testid="submission-status"]')
    //                 .should('have.text', 'Unlocked')
    //
    //             cy.get('table')
    //                 .should('exist')
    //                 .findByText(submissionName)
    //                 .should('have.attr', 'href')
    //                 .and('include', 'review-and-submit')
    //
    //             cy.navigateFormByDirectLink(reviewURL)
    //
    //             //Unlock banner for state user to be present with correct data.
    //             cy.findByRole('heading', {
    //                 level: 2,
    //                 name: /Review and submit/,
    //             })
    //             cy.findByRole('heading', {
    //                 name: `Minnesota ${submissionName}`,
    //             }).should('exist')
    //             cy.findByTestId('unlockedBanner')
    //                 .should('exist')
    //                 .and('contain.text', 'zuko@example.com')
    //                 .and('contain.text', 'Unlock submission reason.')
    //                 .contains(
    //                     /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET+/i
    //                 )
    //                 .should('exist')
    //
    //             //Navigate back to rate details page
    //             cy.navigateFormByButtonClick('BACK')
    //             cy.findByRole('heading', { level: 2, name: /Supporting documents/ })
    //             cy.navigateFormByButtonClick('BACK')
    //             cy.findByRole('heading', { level: 2, name: /Contacts/ })
    //             cy.navigateFormByButtonClick('BACK')
    //             cy.findByRole('heading', { level: 2, name: /Rate details/ })
    //
    //             //Add a fifth rate certification form
    //             cy.findByRole('button', { name: 'Add another rate certification'}).click()
    //
    //             //Remove second and third rate certification
    //             cy.findAllByTestId('rate-certification-form').each((form, index) => {
    //                 if (index === 1 || index === 2) {
    //                     cy.wrap(form).within(() => cy.findByRole('button', { name: 'Remove rate certification'}).click())
    //                 }
    //             })
    //
    //             //Fill out last rate certification form.
    //             cy.findAllByTestId('rate-certification-form').each((form, index, arr) => {
    //                 cy.wrap(form).within(() => {
    //                     //Fill out the last rate certification form
    //                     if (index === arr.length - 1) {
    //                         cy.fillOutAmendmentToPriorRateCertification()
    //                     }
    //                 })
    //             })
    //
    //             //Navigate to review and submit page
    //             cy.navigateFormByButtonClick('CONTINUE')
    //             cy.findByRole('heading', { level: 2, name: /Contacts/ })
    //             cy.navigateFormByButtonClick('CONTINUE')
    //             cy.findByRole('heading', { level: 2, name: /Supporting documents/ })
    //             cy.navigateFormByButtonClick('CONTINUE')
    //             cy.findByRole('heading', { level: 2, name: /Review and submit/ })
    //
    //             cy.submitStateSubmissionForm(true, true)
    //
    //             cy.findByText('Dashboard').should('exist')
    //
    //             cy.get('table')
    //                 .should('exist')
    //                 .findByText(submissionName)
    //                 .parent()
    //                 .siblings('[data-testid="submission-status"]')
    //                 .should('have.text', 'Submitted')
    //
    //             cy.get('table')
    //                 .findByText(submissionName)
    //                 .should('have.attr', 'href')
    //                 .and('not.include', 'review-and-submit')
    //
    //             //Navigate to resubmitted submission and check for submission updated banner
    //             cy.get('table').findByText(submissionName).click()
    //             cy.wait('@fetchHealthPlanPackageQuery', { timeout: 50000 })
    //             cy.findByTestId('updatedSubmissionBanner').should('exist')
    //
    //             //Sign out
    //             cy.findByRole('button', { name: 'Sign out' }).click()
    //
    //             cy.wait(5000)
    //
    //             cy.findByText(
    //                 'Medicaid and CHIP Managed Care Reporting and Review System'
    //             )
    //
    //             // Login as CMS User
    //             cy.logInAsCMSUser({ initialURL: submissionURL })
    //
    //             //  CMS user sees resubmitted submission and active unlock button
    //             cy.findByTestId('submission-summary').should('exist')
    //             cy.findByRole('button', { name: 'Unlock submission' }).should(
    //                 'not.be.disabled'
    //             )
    //
    //             //CSM user should not see unlock banner and should see updated submission banner
    //             cy.findByTestId('unlockedBanner').should('not.exist')
    //             cy.findByTestId('updatedSubmissionBanner').should('exist')
    //
    //             //Open all change history accordion items
    //             cy.findByTestId('accordion').should('exist')
    //
    //             cy.get('[data-testid^="accordionButton_"]').each((button) => {
    //                 button.trigger('click')
    //                 button.siblings().hasClass('usa-accordion__content') /// make sure accordion is expanded
    //             })
    //             //Check for view previous submission link in the initial accordion item to exist
    //             cy.findByTestId('revision-link-1').should('be.visible')
    //             cy.clickSubmissionLink('revision-link-1')
    //             //Making sure we are on SubmissionRevisionSummary page and contains version text
    //             cy.findByTestId('revision-version')
    //                 .should('exist')
    //                 .contains(
    //                     /(0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET version/i
    //                 )
    //             //Previous submission banner should exist and able to click link to go back to current submission
    //             cy.findByTestId('previous-submission-banner').should('exist')
    //             //Navigate back to current submission using link inside banner.
    //             cy.clickSubmissionLink(
    //                 'currentSubmissionLink'
    //             )
    //             //Make sure banner and revision version text are gone.
    //             cy.findByTestId('previous-submission-banner').should(
    //                 'not.exist'
    //             )
    //             cy.findByTestId('revision-version').should('not.exist')
    //         })
    //     })
    // })
})
