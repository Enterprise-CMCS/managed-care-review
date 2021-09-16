describe('contacts', () => {
    it('can navigate to and from contacts page', () => {
        cy.logInAsStateUser()
        cy.startNewContractOnlySubmission()

        // Navigate to contacts page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/contacts`)

            // Navigate to contract details page by clicking back for a contract only submission
            cy.findByRole('link', { name: /Back/ }).click()
            cy.findByRole('heading', { level: 2, name: /Contract details/ })

            // Navigate to type page to switch to contract and rates submission
            cy.visit(`/submissions/${draftSubmissionId}/type`)
            cy.findByLabelText(
                'Contract action and rate certification'
            ).safeClick()
            cy.navigateForm('Continue')

            // Navigate to contacts page
            cy.visit(`/submissions/${draftSubmissionId}/contacts`)

            // Navigate to rate details page by clicking back for a contract and rates submission
            cy.findByRole('link', { name: /Back/ }).click()
            cy.findByRole('heading', { level: 2, name: /Rate details/ })

            // Navigate to contacts page
            cy.visit(`/submissions/${draftSubmissionId}/contacts`)

            // Navigate to dashboard page by clicking save as draft
            cy.findByRole('button', { name: /Save as draft/ }).click()
            cy.findByRole('heading', { level: 1, name: /Dashboard/ })

            // Navigate to contacts page
            cy.visit(`/submissions/${draftSubmissionId}/contacts`)

            cy.fillOutStateContact()
            cy.fillOutActuaryContact()

            // Navigate to documents page by clicking continue
            cy.navigateForm('Continue')
            // HM-TODO: Why doesn't level attribute work here?
            cy.findByRole('heading', { name: /Documents/ })
        })
    })

    it('can add and remove additional state and actuary contacts', () => {
        cy.logInAsStateUser()
        cy.startNewContractAndRatesSubmission()

        // Navigate to contacts page
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/contacts`)

            cy.fillOutStateContact()
            cy.fillOutActuaryContact()

            // Add additional state contact
            cy.findByRole('button', { name: /Add state contact/ }).click()
            cy.findAllByLabelText('Name').eq(1).type('State Contact Person 2')
            cy.findAllByLabelText('Title/Role')
                .eq(1)
                .type('State Contact Title 2')
            cy.findAllByLabelText('Email').eq(1).type('statecontact2@test.com')

            // Add additional actuary contact
            cy.findByRole('button', { name: /Add actuary contact/ }).click()
            cy.findAllByLabelText('Name').eq(3).type('Actuary Contact Person 2')
            cy.findAllByLabelText('Title/Role')
                .eq(3)
                .type('Actuary Contact Title 2')
            cy.findAllByLabelText('Email')
                .eq(3)
                .type('actuarycontact2@test.com')

            // Select additional actuarial firm
            cy.findAllByLabelText('Mercer').eq(1).safeClick()

            // Navigate to documents page by clicking continue
            cy.navigateForm('Continue')
            // HM-TODO: Why doesn't level attribute work here?
            cy.findByRole('heading', { name: /Documents/ })

            // Navigate to contacts page
            cy.visit(`/submissions/${draftSubmissionId}/contacts`)

            // Remove additional state contact
            cy.findAllByRole('button', { name: /Remove contact/ })
                .eq(0)
                .click()
            cy.findByText('State contacts 2').should('not.exist')

            // Remove additional actuary contact
            cy.findAllByRole('button', { name: /Remove contact/ })
                .eq(0)
                .click()
            cy.findByText('Additional actuary contact 1').should('not.exist')
        })
    })
})
