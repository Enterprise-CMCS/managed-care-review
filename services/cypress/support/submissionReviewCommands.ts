Cypress.Commands.add('unlockSubmission', (unlockReason) => {
    // click on the unlock button, type in reason and confirm
    cy.findByRole('button', { name: 'Unlock submission', timeout: 10_000 }).click()
    cy.findAllByTestId('modalWindow').eq(1).should('be.visible')
    cy.get('#unlockSubmitModalInput').type(
        unlockReason || 'Unlock submission reason.'
    )
    cy.findByRole('button', { name: 'Unlock' }).click()

    cy.findByText('No action can be taken on this submission in its current status.').should('exist')
    cy.findAllByTestId('modalWindow').eq(1).should('be.hidden')

    // Unlock banner for CMS user to be present with correct data.
    cy.findByTestId('unlockedBanner').should('exist')
})
