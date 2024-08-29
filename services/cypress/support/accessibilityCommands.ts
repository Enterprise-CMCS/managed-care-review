function terminalLog(violations: Record<string, any>[]) {
    console.log(violations)
    cy.task(
        'log',
        `${violations.length} accessibility violation${
            violations.length === 1 ? '' : 's'
        } ${violations.length === 1 ? 'was' : 'were'} detected`
    )
    // pluck specific keys to keep the table readable
    const violationData: Record<string, any>[] = violations.map(
        ({ id, impact, description, nodes }) => ({
            id,
            impact,
            description,
            nodes: nodes.length
        })
    )

    cy.task('table', violationData)
}

Cypress.Commands.add(
    'checkA11yWithWcag22aa',
    () => {
        cy.checkA11y('', {
            runOnly: {
                type: 'tag',
                values: ['wcag22aa']
            },
        }, terminalLog)
    }
)
