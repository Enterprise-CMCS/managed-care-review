import '@cypress/code-coverage/support'
import 'cypress-axe'

Cypress.on('uncaught:exception', (err, runnable) => {
    // returning false here prevents Cypress from
    // failing the test
    console.error(err)
    console.trace()
    return false
})
