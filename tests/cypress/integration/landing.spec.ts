describe('Landing page - logged out', () => {
    cy.get('#App').should('exist')
    cy.findByRole('heading', {
      name: /How it works/i,
      level: 2,
    })
    cy.findByRole('heading', {
      name: /In this system, pilot state users can/i,
      level: 2,
  })
})
