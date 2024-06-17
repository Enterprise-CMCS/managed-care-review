import { HealthPlanFormDataType, packageName } from "../../../app-web/src/common-code/healthPlanFormDataType"
import { base64ToDomain } from "../../../app-web/src/common-code/proto/healthPlanFormDataProto"
import { HealthPlanPackage } from "../../gen/gqlClient"
import { cmsUser, minnesotaStatePrograms, stateUser } from "../../utils/apollo-test-utils"

describe('CMS user can view rate reviews', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })
    // By default return lastest revision
    const getFormData = (pkg: HealthPlanPackage, indx = 0): HealthPlanFormDataType => {
        const latestRevision = pkg.revisions[indx].node
        if (!latestRevision) {
            throw new Error('no revisions found for package' + pkg.id)
        }

        const unwrapResult = base64ToDomain(latestRevision.formDataProto)
        if (unwrapResult instanceof Error) {
            throw unwrapResult
        }

        return unwrapResult
    }


    it('and navigate to a specific rate from the rates dashboard', () => {
          cy.apiAssignDivisionToCMSUser(cmsUser(), 'DMCO').then(() => {

            // Create a new contract and rates submission with two attached rates
            cy.apiCreateAndSubmitContractWithRates(stateUser()).then(
                (contract) => {

                    const latestSubmission = contract.packageSubmissions[0]

                    const rate1 = latestSubmission.rateRevisions[0]
                    const rate2 = latestSubmission.rateRevisions[1]
                    let rate1Name = rate1.formData.rateCertificationName
                    let rate2Name = rate2.formData.rateCertificationName

                    if (!rate1Name || !rate2Name) {
                        throw new Error(`Unexpected error: Rate name(s) did not exist. Rate1Name: ${rate1Name}, Rate2Name: ${rate2Name}`)
                    }

                    // Then check both rates in rate reviews table
                    cy.logInAsCMSUser({
                        initialURL: `/dashboard/rate-reviews`,
                    })

                    // Rate names can be the same, rare in prod, but common in automated tests and manual tests.
                    // Here were just checking to make sure the first exists in findAll.
                    cy.get('table')
                    .findAllByRole('link', { name: rate1Name }).first()
                    .should('exist')
                    cy.get('table')
                    .findAllByRole('link', { name: rate2Name }).first()
                    .should('exist')

                    // click the first rate to navigate to rate summary page
                    cy.get('table')
                    .findAllByRole('link', { name: rate1Name }).first().click()
                    cy.url({ timeout: 10_000 }).should('contain',rate1.rateID)
                    cy.findByRole('heading', {
                        name: `${rate1.formData.rateCertificationName}`,
                    }).should('exist')
                    cy.findByText('Rate certification type').should('exist').siblings('dd').should('have.text', 'New rate certification')
                    cy.findByText('Rating period').should('exist').siblings('dd').should('have.text', '06/01/2025 to 05/30/2026')
                    cy.findByText('Date certified').should('exist').siblings('dd').should('have.text', '04/15/2025')
                    cy.findByText('Submission this rate was submitted with').should('exist').siblings('dd').should('have.text', latestSubmission.contractRevision.contractName)
                    cy.findByText('Certifying actuary').should('exist').siblings('dd').should('have.text', 'actuary1test titleemail@example.comMercer')
                    // cy.findByText('Download all rate documents').should('exist')
                    cy.findByRole('table', {
                        name: 'Rate certification',
                    }).should('exist')
                    cy.findByText('rate1Document1.pdf').should('exist')
                    cy.findByRole('table', {
                        name: 'Rate supporting documents',
                    }).should('exist')
                })
                cy.findByText('rate1SupportingDocument1.pdf').should('exist')

                // No document dates or other fields are undefined
                cy.findByText('N/A').should('not.exist')

                // Go back to dashboard and check both rates in the table
                // check the dashboard has the columns we expect
                cy.findByText('Back to dashboard').should('exist').click()
                cy.url({ timeout: 10_000 }).should('contain', 'rate-reviews')
                cy.findByText('Rate reviews').should('exist')
                cy.get('thead').should('have.attr', 'data-testid', 'rate-reviews-table').should('be.visible') // can't put id on table itself because data attributes not passing through in react-uswds component
        })
    })
})
