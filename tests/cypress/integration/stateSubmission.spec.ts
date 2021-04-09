describe('State Submission', () => {
    describe('submission type form', () => {
    it('user can start a new submission and continue with valid input', () => {
        cy.login()
        cy.findByTestId('dashboardPage').should('exist')
        cy.findByRole('link', {name: 'Start new submission'}).click({force: true})
        cy.url().should('eq', Cypress.config().baseUrl + '/submissions/new');
       
        // Fill out submission type form
        cy.get('form').should('exist')
        cy.findByRole('combobox', { name: 'Program' }).select('msho')
        cy.findByLabelText('Contract action only').safeClick()
        cy.findByRole('textbox', {name: 'Submission description'}).should('exist').type( 'description of submission')


        cy.findByRole('button', {
            name: 'Continue',
        }).click()
        cy.findByText('Contract details').should('exist')

    })  

    it('user can start a new submission and see errors when trying to continue with invalid input', () => {
        cy.login()
        cy.findByTestId('dashboardPage').should('exist')
        cy.findByRole('link', {name: 'Start new submission'}).click({force: true})
        cy.url().should('eq', Cypress.config().baseUrl + '/submissions/new');

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

    // it.todo('user can edit a draft submission type') 
    })
})
