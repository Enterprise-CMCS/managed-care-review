describe('contacts', () => {
    it('can navigate to and from contacts page with contract only submission', () => {
        cy.logInAsStateUser()
       cy.startNewContractOnlySubmission()

        // Navigate to contacts page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/contacts`)

            // On contacts page, navigate BACK
            cy.navigateForm('BACK')
            cy.findByRole('heading', { level: 2, name: /Contract details/ })


            // On contacts page, SAVE_DRAFT
            cy.visit(`/submissions/${draftSubmissionId}/contacts`)
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.navigateForm('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // On contacts page, fill out information and CONTINUE
            cy.visit(`/submissions/${draftSubmissionId}/contacts`)
            cy.fillOutStateContact()
            cy.navigateForm('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Supporting documents/ })

            // check accessibility of filled out contacts page
            cy.navigateForm('BACK')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.pa11y({
                actions: ['wait for element #form-guidance to be visible'],
                hideElements: '.usa-step-indicator',
            })
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
            cy.visit(`/submissions/${draftSubmissionId}/contacts`)

            // On contacts page, navigate BACK
            cy.navigateForm('BACK')
            cy.findByRole('heading', { level: 2, name: /Rate details/ })

            // On contacts page, SAVE_DRAFT
            cy.visit(`/submissions/${draftSubmissionId}/contacts`)
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.navigateForm('SAVE_DRAFT')
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // On contacts page, fill out information and CONTINUE
            cy.visit(`/submissions/${draftSubmissionId}/contacts`)
            cy.fillOutStateContact()
            cy.fillOutActuaryContact()
            cy.navigateForm('CONTINUE')
            cy.findByRole('heading', { level: 2, name: /Supporting documents/ })

            // check accessibility of filled out contacts page
            cy.navigateForm('BACK')
            cy.findByRole('heading', { level: 2, name: /Contacts/ })
            cy.pa11y({
                actions: ['wait for element #form-guidance to be visible'],
                hideElements: '.usa-step-indicator',
            })
        })
    })
})
