Cypress.Commands.add(
    'addQuestion',
    ({ documentPath }: { documentPath: string }) => {
        // Find Add questions button and click
        cy.findByRole('link', { name: /Add questions/ })
            .should('exist')
            .click()
        // Check we are on the Add questions page
        cy.findByRole('heading', { level: 2, name: /Add questions/ }).should(
            'exist'
        )

        // Add document to question form
        cy.findByTestId('file-input-input').attachFile(documentPath)
        cy.waitForDocumentsToLoad()

        // Submit question
        cy.findByRole('button', { name: 'Add questions' })
            .should('exist')
            .click()

        cy.url().then(url => {
           if (url.includes('/rates/')) {
                cy.wait(['@createRateQuestionMutation', '@fetchRateWithQuestionsQuery'], { timeout: 50_000 })
           } else {
                cy.wait(['@createContractQuestionMutation', '@fetchContractWithQuestionsQuery'], { timeout: 50_000 })
           }
        })
    }
)

Cypress.Commands.add(
    'addResponse',
    ({ documentPath }: { documentPath: string }) => {
        // Find Upload response button in DMCO section and click
        cy.findByRole('link', { name: /Upload response/ })
            .should('exist')
            .click()

        // Check we are on the Add questions page
        cy.findByRole('heading', { level: 2, name: /New response/ }).should(
            'exist'
        )

        // Add document to question form
        cy.findByTestId('file-input-input').attachFile(documentPath)
        cy.waitForDocumentsToLoad()

        // Submit question
        cy.findByRole('button', { name: 'Send response' })
            .should('exist')
            .click()

        cy.url().then(url => {
            if (url.includes('/rates/')) {
                cy.wait(['@createRateQuestionResponseMutation', '@fetchRateWithQuestionsQuery'], { timeout: 50_000 })
            } else {
                cy.wait(['@createContractQuestionResponseMutation', '@fetchContractWithQuestionsQuery'], { timeout: 50_000 })
            }
        })
    }
)
