describe('CMS user', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    it('can unlock and resubmit child rates', () => {
        cy.logInAsStateUser()

        // fill out an entire submission
        cy.startNewContractAndRatesSubmission()
        cy.fillOutBaseContractDetails()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Rate details/,
        }).should('exist')

        cy.findByRole('button', {
            name: 'Add another rate certification',
        }).click()
        cy.findAllByTestId('rate-certification-form').each((form) =>
            cy.wrap(form).within(() => cy.fillOutNewRateCertification())
        )
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Contacts/,
        }).should('exist')
        cy.fillOutStateContact()
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Supporting documents/,
        }).should('exist')
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Review and submit/,
        }).should('exist')

        // Store submission url for reference later
        cy.location().then((fullUrl) => {
            const reviewURL = fullUrl.toString()
            const submissionURL = reviewURL.replace(
                'edit/review-and-submit',
                ''
            )

            // Submit, sent to dashboard
            cy.submitStateSubmissionForm()

            // Login as CMS User
            cy.logOut()
            cy.logInAsCMSUser({ initialURL: submissionURL })

            // click on the unlock button, type in reason and confirm
            cy.unlockSubmission()

            //Unlock banner for CMS user to be present with correct data.
            cy.findByTestId('unlockedBanner')
                .should('exist')
                .and('contain.text', 'zuko@example.com')
                .and('contain.text', 'Unlock submission reason.')
                .contains(
                    /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET/i
                )
                .should('exist')

            //Find unlocked submission name
            cy.get('#submissionName', {timeout: 2_000}).then(($h2) => {
                //Set name to variable for later use in finding the unlocked submission
                const submissionName = $h2.text()

                // Login as state user
                cy.logOut()
                cy.logInAsStateUser()

                // State user sees unlocked submission - check tag then submission link
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
                    .contains(
                        /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET+/i
                    )
                    .should('exist')

                cy.submitStateSubmissionForm({success: true, resubmission: true})

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

                // Navigate to resubmitted submission and check for submission updated banner
                cy.get('table')
                    .findByRole('link', { name: submissionName })
                    .should('exist')
                    .click()

                cy.findByTestId('updatedSubmissionBanner').should('exist')

                // Login as CMS User
                cy.logOut()
                cy.logInAsCMSUser({ initialURL: submissionURL })

                //  CMS user sees resubmitted submission and active unlock button
                cy.findByTestId('submission-summary', {timeout: 4_000}).should('exist')
                cy.findByRole('button', { name: 'Unlock submission' }).should(
                    'not.be.disabled'
                )

                //CMS user should not see unlock banner and should see updated submission banner
                cy.findByTestId('unlockedBanner').should('not.exist')
                cy.findByTestId('updatedSubmissionBanner').should('exist')

                //Open all change history accordion items
                cy.findByTestId('accordion').should('exist')

                cy.get('[data-testid^="accordionButton_"]').each((button) => {
                    button.trigger('click')
                    button.siblings().hasClass('usa-accordion__content') /// make sure accordion is expanded
                })

                // Check for view previous submission link in the initial accordion item to exist
                cy.findByTestId('revision-link-1').should('be.visible')
                cy.clickSubmissionLink('revision-link-1')
                //Making sure we are on SubmissionRevisionSummary page and contains version text
                cy.findByTestId('revision-version')
                    .should('exist')
                    .contains(
                        /(0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET version/i
                    )

                // Previous submission banner should exist and able to click link to go back to current submission
                cy.findByTestId('previous-submission-banner').should('exist')
                //Navigate back to current submission using link inside banner.
                cy.clickSubmissionLink('currentSubmissionLink')
                //Make sure banner and revision version text are gone.
                cy.findByTestId('previous-submission-banner').should(
                    'not.exist'
                )
                cy.findByTestId('revision-version').should('not.exist')

                // Unlock again and resubmit to test change history
                cy.unlockSubmission('Second Unlock')

                // Resubmit again
                cy.logOut()
                cy.logInAsStateUser()
                cy.navigateFormByDirectLink(reviewURL)
                cy.findByTestId('unlockedBanner').should('exist')
                cy.submitStateSubmissionForm({
                        success: true,
                        resubmission: true,
                        summary: 'Second resubmit'
                    }
                )

                // Visit the submission url and check the history
                cy.navigateFormByDirectLink(submissionURL)
                cy.findByTestId('updatedSubmissionBanner').should('exist')

                 // No document dates or other fields are undefined
                 cy.findByText('N/A').should('not.exist')

                // Should have change history records
                cy.findAllByTestId('change-history-record').should('have.length', 5)

                cy.findAllByTestId('change-history-record').then(records => {
                    // We put all the text of each record into an array
                    const recordText = records.map((index, record) => Cypress.$(record).text())

                    // Records are in reverse
                    // Second set of unlock and resubmit
                    expect(recordText[0]).to.contain('Changes made: Second resubmit')
                    expect(recordText[1]).to.contain('Reason for unlock: Second Unlock')

                    // First set of unlock and resubmit
                    expect(recordText[2]).to.contain('Changes made: Resubmission summary')
                    expect(recordText[3]).to.contain('Reason for unlock: Unlock submission reason.')

                    // Test for initial submission
                    expect(recordText[4]).to.contain('Submitted by: aang@example.com')
                    expect(recordText[4]).to.contain('View past submission version')
                    expect(recordText[4]).to.not.contain('Changes made:')
                    expect(recordText[4]).to.not.contain('Reason for unlock:')

                })
            })
        })
    })

    it.only('can unlock and resubmit child rates with linked rates flag', () => {
        cy.interceptFeatureFlags({"link-rates": true, '438-attestation': true})
        cy.logInAsStateUser()

        // fill out contract details
        cy.startNewContractAndRatesSubmission()
        cy.fillOutBaseContractDetails()
        cy.navigateFormByButtonClick('CONTINUE')

        // fill out three rate details - two with child rates AND one with a linked rate
        cy.findByRole('heading', {
            level: 2,
            name: /Rate details/,
        }).should('exist')

        cy.findByRole('button', {
            name: 'Add another rate certification',
        }).click()
        cy.findAllByTestId('rate-certification-form').each((form) =>
            cy.wrap(form).within(() => {
                cy.fillOutNewRateCertification();
        })
        )
        cy.navigateContractRatesFormByButtonClick('CONTINUE')

        // fill out the rest of the form
        cy.findByRole('heading', {
            level: 2,
            name: /Contacts/,
        }).should('exist')
        cy.fillOutStateContact()
        cy.navigateFormByButtonClick('CONTINUE')
        cy.findByRole('heading', {
            level: 2,
            name: /Supporting documents/,
        }).should('exist')
        cy.navigateFormByButtonClick('CONTINUE')

        cy.findByRole('heading', {
            level: 2,
            name: /Review and submit/,
        }).should('exist')

        // Store submission url for reference later
        cy.location().then((fullUrl) => {
            const reviewURL = fullUrl.toString()
            const submissionURL = reviewURL.replace(
                'edit/review-and-submit',
                ''
            )

            // Submit, sent to dashboard
            cy.submitStateSubmissionForm()

            // Login as CMS User
            cy.logOut()
            cy.logInAsCMSUser({ initialURL: submissionURL })
            cy.wait('@fetchContractQuery', { timeout: 20_000 })
            // click on the unlock button, type in reason and confirm
            cy.unlockSubmission()

            //Unlock banner for CMS user to be present with correct data.
            cy.findByTestId('unlockedBanner')
                .should('exist')
                .and('contain.text', 'zuko@example.com')
                .and('contain.text', 'Unlock submission reason.')
                .contains(
                    /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET/i
                )
                .should('exist')

            //Find unlocked submission name
            cy.get('#submissionName', {timeout: 2_000}).then(($h2) => {
                //Set name to variable for later use in finding the unlocked submission
                const submissionName = $h2.text()

                // Login as state user
                cy.logOut()
                cy.logInAsStateUser()

                // State user sees unlocked submission - check tag then submission link
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
                cy.wait('@fetchContractQuery', { timeout: 20_000 })

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
                    .contains(
                        /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET+/i
                    )
                    .should('exist')

                cy.submitStateSubmissionForm({success: true, resubmission: true})

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

                // Navigate to resubmitted submission and check for submission updated banner
                cy.get('table')
                    .findByRole('link', { name: submissionName })
                    .should('exist')
                    .click()

                cy.findByTestId('updatedSubmissionBanner').should('exist')

                // Login as CMS User
                cy.logOut()
                cy.logInAsCMSUser({ initialURL: submissionURL })
                cy.wait('@fetchContractQuery', { timeout: 20_000 })

                //  CMS user sees resubmitted submission and active unlock button
                cy.findByTestId('submission-summary', {timeout: 4_000}).should('exist')
                cy.findByRole('button', { name: 'Unlock submission' }).should(
                    'not.be.disabled'
                )

                //CMS user should not see unlock banner and should see updated submission banner
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
                    .contains(
                        /(0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET version/i
                    )
                //Previous submission banner should exist and able to click link to go back to current submission
                cy.findByTestId('previous-submission-banner').should('exist')
                //Navigate back to current submission using link inside banner.
                cy.clickSubmissionLink('currentSubmissionLink')
                //Make sure banner and revision version text are gone.
                cy.findByTestId('previous-submission-banner').should(
                    'not.exist'
                )
                cy.findByTestId('revision-version').should('not.exist')

                // Unlock again and resubmit to test change history
                cy.unlockSubmission('Second Unlock')

                // Resubmit again
                cy.logOut()
                cy.logInAsStateUser()
                cy.navigateFormByDirectLink(reviewURL)
                cy.wait('@fetchContractQuery', { timeout: 20_000 })
                cy.findByTestId('unlockedBanner').should('exist')
                cy.submitStateSubmissionForm({
                        success: true,
                        resubmission: true,
                        summary: 'Second resubmit'
                    }
                )

                // Visit the submission url and check the history
                cy.navigateFormByDirectLink(submissionURL)
                cy.findByTestId('updatedSubmissionBanner').should('exist')

                 // No document dates or other fields are undefined
                 cy.findByText('N/A').should('not.exist')

                // Should have change history records
                cy.findAllByTestId('change-history-record').should('have.length', 5)

                cy.findAllByTestId('change-history-record').then(records => {
                    // We put all the text of each record into an array
                    const recordText = records.map((index, record) => Cypress.$(record).text())

                    // Records are in reverse
                    // Second set of unlock and resubmit
                    expect(recordText[0]).to.contain('Changes made: Second resubmit')
                    expect(recordText[1]).to.contain('Reason for unlock: Second Unlock')

                    // First set of unlock and resubmit
                    expect(recordText[2]).to.contain('Changes made: Resubmission summary')
                    expect(recordText[3]).to.contain('Reason for unlock: Unlock submission reason.')

                    // Test for initial submission
                    expect(recordText[4]).to.contain('aang@example.com')
                    expect(recordText[4]).to.contain('View past submission version')
                    expect(recordText[4]).to.not.contain('Changes made:')
                    expect(recordText[4]).to.not.contain('Reason for unlock:')

                })
            })
        })
    })

    // TODO AFTER LINKED RATES AND LINKED RATES CHANGE HISTORY SHIPS
    // it('can unlock and resubmit a linked rate and change history updates')
    // it('can unlock and resubmit combination of linked and child rates as expected' )
})
