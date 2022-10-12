describe('rate details', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
    })
    it('can navigate to and from rate details page', () => {0
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to rate details page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/rate-details`)

            // Navigate to contract details page by clicking back
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Contract details/ })

            // Navigate to rate details page
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/rate-details`)

            // Navigate to dashboard page by clicking save as draft
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // Navigate to rate details page
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/rate-details`)

            cy.fillOutNewRateCertification()

            // Navigate to contacts page by clicking continue
            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
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
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/rate-details`)

            cy.fillOutAmendmentToPriorRateCertification()

            // Navigate to contacts page by clicking continue
            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })

            // check accessibility of filled out rate details page
            cy.navigateFormByButtonClick('BACK')
            // Commented out to get react-scripts/webpack 5 upgrade through
            // cy.pa11y({
            //     actions: ['wait for element #form-guidance to be visible'],
            //     hideElements: '.usa-step-indicator',
            //     threshold: 4,
            // })
        })
    })

    it('can get and set dates correctly', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to rate details page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/rate-details`)

            cy.fillOutAmendmentToPriorRateCertification()

            // Navigate to contacts page by clicking continue
            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })


            cy.fillOutStateContact()
            cy.fillOutActuaryContact()
            cy.navigateFormByButtonClick('CONTINUE')

            cy.findByRole('heading', { level: 2, name: /Supporting documents/ })

        })
    })

    it('can add and remove multiple rate certifications and navigate to and from rate details page', () => {
        cy.interceptFeatureFlags({'multi-rate-submissions': true})
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to rate details page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/rate-details`)

            //Add three more rate certification forms, four total.
            cy.findByRole('button', { name: 'Add another rate certification'}).click()
            cy.findByRole('button', { name: 'Add another rate certification'}).click()
            cy.findByRole('button', { name: 'Add another rate certification'}).click()

            //Fil out every rate certification form
            cy.findAllByTestId('rate-certification-form').each((form, index) => {
                cy.wrap(form).within(() => {
                    //Fill out last rate certification as new rate
                    if (index === 3) {
                        cy.fillOutNewRateCertification()
                    } else {
                        cy.fillOutAmendmentToPriorRateCertification()
                    }
                })
            })

            // Navigate to contacts page by clicking continue
            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.fillOutStateContact()
            cy.fillOutActuaryContact()

            // Navigate back to rate details page
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Rate details/ })

            //Remove second and third rate certification
            cy.findAllByTestId('rate-certification-form').each((form, index) => {
                if (index === 1 || index === 2) {
                    cy.wrap(form).within(() => cy.findByRole('button', { name: 'Remove rate certification'}).click())
                }
            })

            // Navigate to contacts page by clicking continue
            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })

            // Navigate back to rate details page
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Rate details/ })

            //Add a third rate certification form and fill it out.
            cy.findByRole('button', { name: 'Add another rate certification'}).click()
            cy.findAllByTestId('rate-certification-form').each((form, index, arr) => {
                cy.wrap(form).within(() => {
                    //Fill out the last rate certification form
                    if (index === arr.length - 1) {
                        cy.fillOutAmendmentToPriorRateCertification()
                    }
                })
            })

            // Navigate to contacts page by clicking continue
            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
        })
    })
})
