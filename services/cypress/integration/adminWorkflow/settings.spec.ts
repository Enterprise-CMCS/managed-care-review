describe('Admin user can view application level settings', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })

    it('and filter down state analysts by state code', () => {
         cy.logInAsAdminUser({initialURL: '/mc-review-settings'})
          // Table data has both minnesota entries and florida entries
         cy.findByRole('table').should('exist').should('include.text', 'FL').should('include.text', 'MN')

         // save current number of rows so we can filter
         cy.findByRole('table', {name: 'State assignments'})
         .find("tr")
         .then((rows) => {
           const lengthBeforeFilter = rows.length;

         //click into emails filters, do nothing, then go over state filter
         cy.findByRole('button', { name: 'Filters'}).click()
         cy.findByRole('combobox', {
            name: 'analysts filter selection', timeout: 2_000
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

    it('can update state assignment and see in on the state assignment table', () => {
        cy.interceptFeatureFlags({'read-write-state-assignments': true})

        // // make sure cms users are in db first
        cy.logInAsCMSUser({ cmsUser: 'ZUKO', initialURL: '/'})
        cy.logOut()

        cy.logInAsCMSUser({ cmsUser: 'AZULA', initialURL: '/'})
        cy.logOut()

        // Assign DMCO division to CMS users.
        cy.logInAsAdminUser({initialURL: '/mc-review-settings'})
        cy.findByRole('link', { name: 'Division assignments'}).click()
        cy.wait('@indexUsersQuery', { timeout: 20_000 })
        cy.findByRole('table', {name: 'Division assignments'}).should('exist')

        cy.findByText('Zuko').should('exist')
        cy.findAllByText('Hotman').should('have.length.at.least', 1)
        cy.assignDivisionToCMSUser({cmsUser: 'ZUKO', division: 'DMCO'})
        cy.findByText('Zuko').should('exist').siblings().should('include.text', 'selected.DMCO') // not accesible but dropdowns are not good idea

        cy.findByText('Azula').should('exist')
        cy.findAllByText('Hotman').should('have.length.at.least', 1)
        cy.assignDivisionToCMSUser({cmsUser: 'AZULA', division: 'DMCO'})
        cy.findByText('Azula').should('exist').siblings().should('include.text', 'selected.DMCO') // not accesible but dropdowns are not good idea
        cy.findByRole('link', { name: 'State assignments'}).should('exist').click()
        cy.findByRole('table', { name: 'State assignments' }).should('exist')

        // Navigate to edit AL state assignments
        cy.findByTestId('edit-link-AL').should('exist').click()
        cy.wait('@fetchMcReviewSettingsQuery')
        cy.findByText('Edit state assignment')
        cy.findByText('AL')

        //Clear out existing assignments if they exist from test re-runs.
        cy.get('body').then($body => {
            if ($body.find('[class*="select__clear-indicator"]').length > 0) {
                cy.get('[class*="select__clear-indicator"]').click()
            }
        })

        // Assign Zuko
        cy.findByRole('combobox').should('exist').click()
        cy.findByRole('option', { name: 'Zuko Hotman'}).should('exist').click()

        // Assign Azula
        cy.findByRole('combobox').should('exist').click()
        cy.findByRole('option', { name: 'Azula Hotman'}).should('exist').click()

        // Save changes
        cy.findByRole('button', { name: 'Save changes'}).should('exist').click()
        cy.wait('@fetchMcReviewSettingsQuery')

        // Check for confirmation banner.
        cy.findByText(`Alabama's assigned staff has been updated`)
        cy.findByText(`Zuko Hotman was assigned to this state`)
        cy.findByText(`Azula Hotman was assigned to this state`)

        // Check to AL assignments have been saved.
        cy.findAllByRole('row').should('exist').eq(1).within(row => {
            cy.findByText('AL')
            cy.findByText('Zuko Hotman, Azula Hotman')
        })

        // Remove Azula from assignment
        cy.findByTestId('edit-link-AL').should('exist').click()
        cy.wait('@fetchMcReviewSettingsQuery')
        cy.findByText('Edit state assignment')
        cy.findByText('AL')

        // Remove Azula
        cy.findByRole('button', { name: 'Remove Azula Hotman'}).should('exist').click()

        // Save changes
        cy.findByRole('button', { name: 'Save changes'}).should('exist').click()
        cy.wait('@fetchMcReviewSettingsQuery')

        // Check for confirmation banner.
        cy.findByText(`Alabama's assigned staff has been updated`)
        cy.findByText(`Zuko Hotman was assigned to this state`)
        cy.findByText(`Azula Hotman was removed`)

        // Check to AL assignments have been saved.
        cy.findAllByRole('row').should('exist').eq(1).within(() => {
            cy.findByText('AL')
            cy.findByText('Zuko Hotman')
        })
    })
})
