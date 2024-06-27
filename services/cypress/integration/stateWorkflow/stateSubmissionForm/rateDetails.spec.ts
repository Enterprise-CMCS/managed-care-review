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
            cy.navigateContractRatesForm('BACK')
            cy.findByRole('heading', { level: 2, name: /Contract details/ })

            // Navigate to rate details page
            cy.navigateFormByDirectLink(
                `/submissions/${draftSubmissionId}/edit/rate-details`
            )

            // Navigate to dashboard page by clicking save as draft
            cy.navigateContractRatesForm('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Submissions dashboard/ })
        })
    })

    it('can add and remove multiple rate certifications and navigate to and from rate details page', () => {
        cy.logInAsStateUser()

        //Start contract and rates submission
        cy.startNewContractAndRatesSubmission()

        //Fill out contract details
        cy.fillOutBaseContractDetails()

        //Continue to Rate details page
        cy.deprecatedNavigateV1Form('CONTINUE')
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
                        cy.fillOutAdditionalActuaryContact()
                    } else {
                        cy.fillOutAmendmentToPriorRateCertification(index)
                    }
                })
            }
            )
        

        // Navigate to contacts page by clicking continue
        cy.navigateContractRatesForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Contacts/ })

        //Fill out one state and one additional actuary contact
        cy.fillOutStateContact()

        // Navigate back to rate details page
        cy.deprecatedNavigateV1Form('BACK')
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
        cy.navigateContractRatesForm('CONTINUE')
        cy.findByRole('heading', { level: 2, name: /Contacts/ })
    })
})
