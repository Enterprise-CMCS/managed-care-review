import { HealthPlanFormDataType, packageName } from "../../../app-web/src/common-code/healthPlanFormDataType"
import { base64ToDomain } from "../../../app-web/src/common-code/proto/healthPlanFormDataProto"
import { HealthPlanPackage } from "../../gen/gqlClient"
import { cmsUser, deprecatedContractAndRatesData, minnesotaStatePrograms, stateUser } from "../../utils/apollo-test-utils"

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

    // NEEDS TO BE REWRITTEN AS API TEST WE FINISH CONTRACT API EPIC
    it.skip('and navigate to a specific rate from the rates dashboard', () => {
          cy.apiAssignDivisionToCMSUser(cmsUser(), 'DMCO').then(() => {

            // Create a new contract and rates submission with two attached rates
            cy.apiDeprecatedCreateSubmitHPP(stateUser(), deprecatedContractAndRatesData()).then(
                (pkg) => {
                const submission = getFormData(pkg)
                    const submissionName = packageName(
                        pkg.stateCode,
                        submission.stateNumber,
                        submission.programIDs,
                        minnesotaStatePrograms
                    )
                // Then check both rates in rate reviews table
                cy.logInAsCMSUser({
                    initialURL: `/dashboard/rate-reviews`,
                })
                const rate1 = submission.rateInfos[0]
                const rate2 = submission.rateInfos[1]
                cy.get('table')
                .findByRole('link', { name: rate1.rateCertificationName })
                .should('exist')
                cy.get('table')
                .findByRole('link', { name: rate2.rateCertificationName })
                .should('exist')

                // click the first rate to navigate to rate summary page
                cy.get('table')
                .findByRole('link', { name: rate1.rateCertificationName })
                .should('exist').click()
                cy.url({ timeout: 10_000 }).should('contain',rate1.id)
                cy.findByRole('heading', {
                    name: `${rate1.rateCertificationName}`,
                }).should('exist')
                cy.findByText('Rate certification type').should('exist').siblings('dd').should('have.text', 'New rate certification')
                cy.findByText('Rating period').should('exist').siblings('dd').should('have.text', '06/01/2025 to 05/30/2026')
                cy.findByText('Date certified').should('exist').siblings('dd').should('have.text', '04/15/2025')
                cy.findByText('Submission this rate was submitted with').should('exist').siblings('dd').should('have.text', submissionName)
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
