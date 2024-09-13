import {getRules} from 'axe-core'

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
                type: 'tags',
                values: ['wcag2a','wcag2aa', 'wcag21a', 'wcag21aa','wcag22aa']
            },
            rules: {
                // Rule skipped. It can be removed from config when https://jiraent.cms.gov/browse/MCR-4421 has been
                // completed
                'aria-allowed-attr': { enabled: false },
                // Both of these rules are skipped. They can be removed from config when
                // https://jiraent.cms.gov/browse/MCR-4420 has been completed
                'dlitem': { enabled: false },
                'definition-list': { enabled: false }
            }
        }, terminalLog)
    }
)
