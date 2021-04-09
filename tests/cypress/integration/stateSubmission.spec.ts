describe('State Submission', () => {
    describe('submission type form', () => {
    it('user can start a new submission and continue with valid input', () => {
        cy.login()
        cy.findByTestId('dashboardPage').should('exist')
        cy.findByRole('link', {name: 'Start new submission'}).should('be.visible').click({force: true})
        cy.location('pathname').should('eq', '/submissions/new')
       
        // Fill out new submission form
        cy.findByRole('form', { name: 'New Submission Form' })
        cy.findByRole('combobox', { name: 'Program' }).select('msho')
        cy.findByLabelText('Contract action only').safeClick()
        cy.findByRole('textbox', {name: 'Submission description'}).should('exist').type( 'description of submission')


        cy.findByRole('button', {
            name: 'Continue',
        }).click()
        cy.findByText('Contract details').should('exist')

    })  

    it('user can start a new submission and see errors with invalid input', () => {
        cy.login()
        cy.findByTestId('dashboardPage').should('exist')
        cy.findByRole('link', {name: 'Start new submission'}).click({force: true})
        cy.location('pathname').should('eq', '/submissions/new')

        // Fill out some fields but not all
        cy.findByRole('combobox', { name: 'Program' }).select('msho')
        cy.findByLabelText('Contract action only').safeClick()

        cy.findByRole('button', {
            name: 'Continue',
        }).click()
        
        cy.findByText(
                'You must provide a description of any major changes or updates'
            ).should('exist')
    })  

    it('user can edit a draft submission type', () => {
        // Add new submission
        cy.login()
        cy.findByRole('link', {name: 'Start new submission'}).click({force: true})
        cy.findByRole('combobox', { name: 'Program' }).select('msho')
        cy.findByLabelText('Contract action only').safeClick()
        cy.findByRole('textbox', {name: 'Submission description'}).should('exist').type( 'description of submission')
        cy.findByRole('button', {
            name: 'Continue',
        }).click()
        cy.findByText('Contract details').should('exist')

        // Get draft submission id and navigate back to submission type form to edit existing draft
        cy.location().then(fullUrl => {
            const { pathname } = fullUrl
            const pathnameArray = pathname.split('/');
            const draftSubmissionId = pathnameArray[2];
            cy.visit(`/submissions/${draftSubmissionId}/type`)
          })
        
          // Check that submission type form loads with correct data
          cy.findByText('404 / Page not found').should('not.exist')
          cy.findByRole('combobox', { name: 'Program' }).should('have.value', "msho")
          cy.findByLabelText('Contract action only').should('be.checked')
          cy.findByRole('textbox', {name: 'Submission description'}).should('have.value', "description of submission")
    }) 
    })
})
