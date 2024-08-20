describe('Admin user can view application level settings', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })

    it('and update user division assignments', () => {
        // make sure a cms user in db first
        cy.logInAsCMSUser()
        cy.logOut()

        cy.logInAsAdminUser({initialURL: '/settings'})
        cy.findByRole('tab', {name: 'CMS users'}).click()
        cy.findByRole('table', {name: 'CMS Users'}).should('exist')
        cy.findByText('Zuko').should('exist')
        cy.findAllByText('Hotman').should('have.length.at.least', 1)
        cy.assignDivisionToCMSUser({userEmail: 'zuko@example.com', division: 'DMCO'})
        cy.findByText('Zuko').should('exist').siblings().should('include.text', 'selected.DMCO') // not accesible but dropdowns are not good idea
        cy.assignDivisionToCMSUser({userEmail: 'zuko@example.com', division: 'DMCP'})
        cy.findByText('Zuko').should('exist').siblings().should('include.text', 'selected.DMCP') // not accesible but dropdowns are not good idea
        cy.assignDivisionToCMSUser({userEmail: 'zuko@example.com', division: 'OACT'})
        cy.findByText('Zuko').should('exist').siblings().should('include.text', 'selected.OACT') // not accesible but dropdowns are not good idea

    })

    it('and filter down state analysts by state code', () => {
         cy.logInAsAdminUser({initialURL: '/settings'})
         cy.findByRole('tab', {name: 'State analysts'}).click()
          // Table data has both minnesota entries and florida entries
         cy.findByRole('table').should('exist').should('include.text', 'FL').should('include.text', 'MN')

         // save current number of rows so we can filter
         cy.findByRole('table', {name: 'Analyst emails'})
         .find("tr")
         .then((rows) => {
           const lengthBeforeFilter = rows.length;


         //click into emails filters, do nothing, then go over state filter
         cy.findByRole('combobox', {
            name: 'emails filter selection', timeout: 2_000
        }).click({
            force: true,
        })
         cy.findByRole('combobox', {
            name: 'state filter selection', timeout: 2_000
        }).click({
            force: true,
        })


        cy.findByRole('option', {name: 'MN'}).click()
        // Table data has minnesota entries but no florida entries
        cy.findByRole('table').should('exist').should('not.include.text', 'FL').should('include.text', 'MN')
        // Table data is also less rows long
        cy.findAllByRole('row').should('have.length.lessThan', lengthBeforeFilter)
        });


    })
})
