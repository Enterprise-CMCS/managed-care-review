import { userLoginData, type CMSUserLoginNames } from './loginCommands';
import { Division } from '../gen/gqlClient';

Cypress.Commands.add('assignDivisionToCMSUser', ({
    cmsUser,
    division
 }: {
    cmsUser: CMSUserLoginNames,
    division: Division
}) => {
    // Find the table row for the user
    cy.findByText(userLoginData[cmsUser].email).parent().then(row => {
        // Do all the things inside the row element
        cy.wrap(row).within(() => {
            // Click the combobox
            cy.findByRole('combobox').click()

            // Find react select drop down options using its id attribute and find the division within the element.
            // This is so if user already has a division that matches the one passed into this command, we don't
            // click the input, instead of the options in the dropdown.
            cy.get('[id^=react-select-][id$=-listbox]').then(listbox => {
                cy.wrap(listbox).within(() => {
                    cy.findByText(division).click()
                })
            })

            cy.wait('@updateDivisionAssignmentMutation', { timeout: 20_000 })

            // Assigned division to CMS user should now match the one passed into the command.
            cy.findByText(division).should('exist')
        })
    })
})
