describe('submission type', () => {
    it('user can switch a draft contract and rates submission to be contract only', () => {
        cy.loginAsStateUser()

        cy.startNewContractAndRatesSubmission()
        cy.navigateForm('Continue')
        cy.findByText(/^MN-PMAP-/).should('exist')

        // Fill out contract details
        cy.findByLabelText('Base contract').safeClick()
        cy.findByLabelText('Start date').type('04/01/2024')
        cy.findByLabelText('End date').type('03/31/2025').blur()
        cy.findByLabelText('Managed Care Organization (MCO)').safeClick()
        cy.findByLabelText('1932(a) State Plan Authority').safeClick()
        cy.findAllByTestId('errorMessage').should('have.length', 0)

        cy.navigateForm('Continue')

        //Add rate details
        cy.findByLabelText('New rate certification').safeClick()
        cy.findByLabelText('Start date').type('04/01/2024')
        cy.findByLabelText('End date').type('03/31/2025')
        cy.findByLabelText('Date certified').type('03/01/2024')

        // Continue button navigates to state contacts page
        cy.navigateForm('Continue')

        // fill out state contacts
        cy.findAllByLabelText('Name').eq(0).type('Test Person')
        cy.findAllByLabelText('Title/Role').eq(0).type('Fancy Title')
        cy.findAllByLabelText('Email').eq(0).type('test@test.com')

        // add actuary contact
        cy.findAllByLabelText('Name').eq(1).type('Act Person')
        cy.findAllByLabelText('Title/Role').eq(1).type('Act Title')
        cy.findAllByLabelText('Email').eq(1).type('act@test.com')
        cy.findByLabelText('Mercer').safeClick()

        // actuary communication preference
        cy.findByLabelText(
            `OACT can communicate directly with the state’s actuary but should copy the state on all written communication and all appointments for verbal discussions.`
        ).safeClick()

        // Continue button navigates to documents page
        cy.findByRole('button', {
            name: 'Continue',
        }).safeClick()

        // Add documents
        cy.waitForLoadingToComplete()
        cy.findByTestId('documents-hint').should(
            'contain.text',
            'Must include: An executed contract'
        )
        cy.findByTestId('file-input-input').attachFile(
            'documents/trussel-guide.pdf'
        )
        cy.findByText('trussel-guide.pdf').should('exist')
        cy.findByText('Upload failed').should('not.exist')
        cy.findByText('Duplicate file').should('not.exist')

        // Continue button with valid documents navigates to review and submit page
        cy.waitForDocumentsToLoad()
        cy.navigateForm('Continue')

        // Get draft submission id and navigate back to submission type form to edit existing draft
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/type`)
        })

        // Check Step Indicator loads with submission type heading
        cy.findByTestId('step-indicator')
            .findAllByText('Submission type')
            .should('have.length', 2)

        // Change type to contract and rates submission
        cy.findByLabelText('Contract action and rate certification').should(
            'be.checked'
        )
        cy.findByRole('textbox', { name: 'Submission description' }).should(
            'have.value',
            'description of contract and rates submission'
        )
        cy.findByLabelText('Contract action only').safeClick()
        cy.navigateForm('Continue')

        cy.findByText(/MN-PMAP/).should('exist')
        cy.findByLabelText('Base contract').should('be.checked')
        cy.findByLabelText('Start date').clear()
        cy.findByLabelText('Start date').type('04/15/2024')
        cy.findByLabelText('End date').clear()
        cy.findByLabelText('End date').type('04/15/2026')

        // Change contract dates
        cy.findByTestId('step-indicator')
            .findAllByText('Contract details')
            .should('have.length', 2)

        cy.findByRole('button', {
            name: 'Continue',
        }).safeClick()

        // change state contacts
        cy.findByLabelText('Name').clear()
        cy.findByLabelText('Name').type('Different Person')

        cy.findByLabelText('Email').clear()
        cy.findByLabelText('Email').type('test2@test.com')

        cy.findByRole('button', {
            name: 'Continue',
        }).safeClick()

        // Check that documents loads with correct data
        cy.findByRole('heading', { name: /Documents/ })
        cy.findByTestId('documents-hint').should(
            'contain.text',
            'Must include: An executed contract'
        )
        cy.findByText('trussel-guide.pdf').should('exist')
    })

    it('user can edit a contract only submission', () => {
        cy.loginAsStateUser()

        cy.startNewContractOnlySubmission()
        cy.navigateForm('Continue')
        cy.findByText(/^MN-PMAP-/).should('exist')

        cy.findByTestId('step-indicator').should('exist')

        // Get draft submission id and navigate back to submission type form to edit existing draft
        cy.location().then((fullUrl) => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/')
            const draftSubmissionId = pathnameArray[2]
            cy.visit(`/submissions/${draftSubmissionId}/type`)
        })

        // Check that submission type form loads with correct data
        cy.findByText('404 / Page not found').should('not.exist')
        cy.findByRole('combobox', { name: 'Program' }).should(
            'have.value',
            'pmap'
        )
        cy.findByLabelText('Contract action only').should('be.checked')
        cy.findByRole('textbox', { name: 'Submission description' }).should(
            'have.value',
            'description of contract only submission'
        )
    })
})
