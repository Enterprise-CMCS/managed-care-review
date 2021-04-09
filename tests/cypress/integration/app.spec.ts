describe('Application - initial load', () => {
    it('loads without errors', () => {
      cy.visit('/')
      cy.get('#App').should('exist')
    })
    it('displays header', () => {
        cy.visit('/')
        cy.get('header').should('exist')
    })
  
    it('displays footer', () => {
        cy.visit('/')
        cy.get('footer').should('exist')
    })

    it('displays main', () => {
        cy.visit('/')
        cy.get('main').should('exist')
    })
  
  })
    