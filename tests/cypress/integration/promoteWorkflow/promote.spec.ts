describe('promote', () => {
    it('can load without errors', () => {
        cy.visit('/')
        cy.get('#App').should('exist')
    })

    it('can display header', () => {
        cy.visit('/')
        cy.get('header').should('exist')
    })

    it('can display heading at root path', () => {
        cy.visit('/')
        cy.findByRole('heading', {
            name: /How it works/i,
            level: 2,
        })
    })

    it('can displays main', () => {
        cy.visit('/')
        cy.get('main').should('exist')
    })

    it('can display expected headings that describe how Managed Care Review works', () => {
        cy.visit('/')
        cy.get('#App').should('exist')
        cy.findByRole('heading', {
            name: /How it works/i,
            level: 2,
        })
        cy.findByRole('heading', {
            name: /You can submit capitation rates and contracts/i,
            level: 2,
        })
    })

    it('can display footer', () => {
        cy.visit('/')
        cy.get('footer').should('exist')
    })
})
