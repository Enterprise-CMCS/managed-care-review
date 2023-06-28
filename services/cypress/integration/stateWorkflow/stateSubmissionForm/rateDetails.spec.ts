describe('rate details', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    it('can navigate back and save as draft from rate details page', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to rate details page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/rate-details`
            )

            // Navigate to contract details page by clicking back
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Contract details/ })

            // Navigate to rate details page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/rate-details`
            )

            // Navigate to dashboard page by clicking save as draft
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })
        })
    })

    it('can add amendment to prior rate certification', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to rate details page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/rate-details`
            )

            cy.fillOutAmendmentToPriorRateCertification()
            /* Choose another submission that the rate cert was uploaded to, then check that your selection
            is still there when you come back */
            cy.findByRole('radiogroup', {
                name: /Was this rate certification uploaded to any other submissions?/,
            })
                .should('exist')
                .within(() => {
                    cy.findByText('Yes').click()
                })
            cy.findByRole('combobox', { name: 'submission (required)' }).click({
                force: true,
            })
            cy.findByText(/MCR-MN-0001-PMAP/i).click()
            // Navigate to contacts page by clicking continue
            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })

            // check accessibility of filled out rate details page
            cy.navigateFormByButtonClick('BACK')
            cy.findByText(/MCR-MN-0001-PMAP/i).should('be.visible')
            // check that selections can be removed
            cy.findByRole('button', {
                name: /Remove MCR-MN-0001-PMAP/i,
            }).click()
            cy.findByText(/Remove MCR-MN-0001-PMAP/i).should('not.exist')
            // Commented out to get react-scripts/webpack 5 upgrade through
            // cy.pa11y({
            //     actions: ['wait for element #form-guidance to be visible'],
            //     hideElements: '.usa-step-indicator',
            //     threshold: 4,
            // })
        })
    })

    it('can add and remove multiple rate certifications and navigate to and from rate details page', () => {
        cy.logInAsStateUser()

        //Start contract and rates submission
        cy.startNewContractAndRatesSubmission()

        //Fill out contract details
        cy.fillOutBaseContractDetails()

        //Continue to Rate details page
        cy.navigateFormByButtonClick('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Rate details/ })

        //Add two more rate certifications, total three
        cy.findByRole('button', {
            name: 'Add another rate certification',
        }).click()
        cy.findByRole('button', {
            name: 'Add another rate certification',
        }).click()

        cy.findAllByTestId('rate-certification-form').should('have.length', 3)
        //Fill out every rate certification form
        cy.findAllByTestId('rate-certification-form').each(
            (form, index, arr) => {
                cy.wrap(form).within(() => {
                    //Fill out last rate certification as new rate
                    if (index === arr.length - 1) {
                        cy.fillOutNewRateCertification()
                    } else {
                        cy.fillOutAmendmentToPriorRateCertification(index)
                    }
                })
            }
        )

        // Navigate to contacts page by clicking continue
        cy.navigateFormByButtonClick('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Contacts/ })

        //Fill out one state and one additional actuary contact
        cy.fillOutStateContact()
        cy.findByRole('button', { name: /Add actuary contact/ }).safeClick()
        cy.findAllByTestId('actuary-contact').should('have.length', 1)
        cy.fillOutAdditionalActuaryContact()

        // Navigate back to rate details page
        cy.navigateFormByButtonClick('BACK')
        cy.findByRole('heading', { level: 2, name: /Rate details/ })

        //Remove last rate certification, total two
        cy.findAllByTestId('rate-certification-form').each(
            (form, index, arr) => {
                if (index === arr.length - 1) {
                    cy.wrap(form).within(() =>
                        cy
                            .findByRole('button', {
                                name: 'Remove rate certification',
                            })
                            .click()
                    )
                }
            }
        )
        cy.findAllByTestId('rate-certification-form').should('have.length', 2)

        // Navigate to contacts page by clicking continue
        cy.navigateFormByButtonClick('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Contacts/ })
    })
})
