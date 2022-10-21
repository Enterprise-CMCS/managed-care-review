describe('contacts', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
    })
    it('can navigate to and from contacts page with contract only submission', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()

        // Navigate to contacts page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]

            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/contacts`)

            // On contacts page, navigate BACK
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Contract details/ })

            // On contacts page, SAVE_DRAFT
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/contacts`)

            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // On contacts page, fill out information and CONTINUE
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/contacts`)
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.fillOutStateContact()
            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Supporting documents/ })

            // check accessibility of filled out contacts page
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            // Commented out to get react-scripts/webpack 5 upgrade through
            // cy.pa11y({
            //     actions: ['wait for element #form-guidance to be visible'],
            //     hideElements: '.usa-step-indicator',
            // })
        })
    })
    it('can navigate to and from contacts page with contract and rates submission', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to contacts page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/contacts`)

            // On contacts page, navigate BACK
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Rate details/ })

            // On contacts page, SAVE_DRAFT
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/contacts`)

            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // On contacts page, fill out information and CONTINUE
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/contacts`)
            cy.findByRole('heading', {
                level: 2,
                name: /Contacts/,
            })
            cy.fillOutStateContact()
            cy.fillOutActuaryContact()
            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Supporting documents/ })

            // check accessibility of filled out contacts page
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            // Commented out to get react-scripts/webpack 5 upgrade through
            // cy.pa11y({
            //     actions: ['wait for element #form-guidance to be visible'],
            //     hideElements: '.usa-step-indicator',
            // })
        })
    })
    it('can navigate to and from contacts page with contract and rates submission with multi-rate-submissions flag on', () => {
        cy.interceptFeatureFlags({'multi-rate-submissions': true})
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to contacts page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/contacts`)

            // On contacts page, navigate BACK
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Rate details/ })

            // On contacts page, SAVE_DRAFT
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/contacts`)

            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.navigateFormByButtonClick('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // On contacts page, fill out information and CONTINUE
            cy.navigateFormByDirectLink(`/submissions/${draftSubmissionId}/edit/contacts`)
            cy.findByRole('heading', {
                level: 2,
                name: /Contacts/,
            })
            cy.fillOutStateContact()

            //Add two additional actuary contacts
            cy.findByRole('button', { name: /Add actuary contact/}).safeClick()
            cy.findByRole('button', { name: /Add actuary contact/}).safeClick()

            //Actuary contact should have 2 sets of actuary inputs
            cy.findAllByTestId('actuary-contact').should('have.length', 2)

            //Fill out first actuary contact
            cy.findAllByLabelText('Name').eq(1).click().type('Actuary Contact Person')
            cy.findAllByLabelText('Title/Role').eq(1).type('Actuary Contact Title')
            cy.findAllByLabelText('Email').eq(1).type('actuarycontact@test.com')
            cy.findAllByLabelText('Mercer').eq(0).safeClick()

            //Fill out second actuary contact
            cy.findAllByLabelText('Name').eq(2).click().type('Actuary Contact Person')
            cy.findAllByLabelText('Title/Role').eq(2).type('Actuary Contact Title')
            cy.findAllByLabelText('Email').eq(2).type('actuarycontact@test.com')
            cy.findAllByLabelText('Mercer').eq(1).safeClick()

            // Actuary communication preference
            cy.findByText(
                `OACT can communicate directly with the state’s actuaries but should copy the state on all written communication and all appointments for verbal discussions.`
            ).click()

            cy.navigateFormByButtonClick('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Supporting documents/ })

            // check accessibility of filled out contacts page
            cy.navigateFormByButtonClick('BACK')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            // Commented out to get react-scripts/webpack 5 upgrade through
            // cy.pa11y({
            //     actions: ['wait for element #form-guidance to be visible'],
            //     hideElements: '.usa-step-indicator',
            // })
        })
    })
})
