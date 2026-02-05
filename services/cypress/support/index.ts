// ***********************************************************
// support/index.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
import '@cypress/code-coverage/support'
import './loginCommands'
import './stateSubmissionFormCommands'
import './submissionReviewCommands'
import './dashboardCommands'
import './navigateCommands'
import './questionResponseCommands'
import './launchDarklyCommands'
import './userSettingCommands'
import './e2e'
import {
    FeatureFlagLDConstant,
    FeatureFlagSettings,
} from '@mc-review/common-code'
import './apiCommands'
import './accessibilityCommands'
import { Contract, Division, OauthClient } from '../gen/gqlClient'
import { AdminUserType, CMSUserType, StateUserType } from '../utils/apollo-test-utils'
import { CMSUserLoginNames } from './loginCommands'
import { FormButtonKey } from './navigateCommands'
import { ApiCreateOAuthClientResponseType, ThirdPartyApiRequestInput, ThirdPartyApiRequestOutput } from './apiCommands'

declare global {
    namespace Cypress {
        interface Chainable<Subject = any> {
            // commands
            safeClick(): void

            // login commands
            logInAsStateUser(): void
            logInAsCMSUser(args?: {
                initialURL?: string
                cmsUser?: CMSUserLoginNames
            }): void
            logInAsAdminUser(args?: { initialURL: string }): void
            logOut(): void

            // state submission form commands
            waitForDocumentsToLoad(): void
            startNewContractOnlySubmissionWithBaseContract(): void
            startNewContractOnlySubmissionWithBaseContractV2(): void
            startNewContractOnlySubmissionWithAmendment(): void
            startNewContractAndRatesSubmission(): void
            fillOutContractActionOnlyWithBaseContract(): void
            fillOutContractActionOnlyWithAmendment(): void
            fillOutContractActionAndRateCertification(): void
            fillOutBaseContractDetails(): void
            fillOutAmendmentToBaseContractDetails(): void
            fillOutNewRateCertification(): void
            fillOutLinkedRate(): void
            fillOutAmendmentToPriorRateCertification(id?: number): void
            fillOutStateContact(): void
            fillOutAdditionalActuaryContact(): void
            fillOutSupportingDocuments(): void
            verifyDocumentsHaveNoErrors(): void
            submitStateSubmissionForm(args?: {
                success?: boolean
                resubmission?: boolean
                summary?: string
            }): void

            // EQRO submission form commands
            startNewEQROSubmission(): void
            fillOutEQROSubmissionDetails(): void
            fillOutEQROContractDetails(): void

            // submission review commands
            unlockSubmission(unlockReason?: string): void

            // navigate commands
            navigateContractRatesForm(
                buttonName: FormButtonKey,
                waitForLoad?: boolean
            ): void
            navigateContractForm(
                buttonName: FormButtonKey,
                waitForLoad?: boolean
            ): void
            navigateFormByDirectLink(url: string, waitForLoad?: boolean): void
            navigateToDashboard(): void

            // dashboard commands
            clickSubmissionLink(testId: string): void

            // question response commands
            addQuestion({ documentPath }: { documentPath: string }): void
            addResponse({ documentPath }: { documentPath: string }): void

            // Launch Darkly commands
            stubFeatureFlags(): void
            interceptFeatureFlags(toggleFlags?: FeatureFlagSettings): void
            getFeatureFlagStore(
                featureFlag?: FeatureFlagLDConstant[]
            ): Chainable<FeatureFlagSettings>

            // User settings commands
            assignDivisionToCMSUser({
                cmsUser,
                division,
            }: {
                cmsUser: CMSUserLoginNames
                division: Division
            }): void

            // Direct API commands
            apiCreateAndSubmitContractOnlySubmission(
                stateUser: StateUserType
            ): Cypress.Chainable<Contract>
            apiCreateAndSubmitEQROSubmission(
                stateUser: StateUserType
            ): Cypress.Chainable<Contract>
            apiCreateAndSubmitContractWithRates(
                stateUser: StateUserType
            ): Cypress.Chainable<Contract>
            apiAssignDivisionToCMSUser(
                cmsUser: CMSUserType,
                division: Division
            ): Cypress.Chainable<void>
            apiCreateAndSubmitContractWithRates(
                stateUser: StateUserType
            ): Cypress.Chainable<Contract>
            apiCreateOAuthClient(
                adminUser: AdminUserType,
                oauthClientUser: CMSUserLoginNames,
                delegatedUser?: CMSUserLoginNames
            ): Cypress.Chainable<ApiCreateOAuthClientResponseType>
            apiRequestOAuthToken(
                oauthClient: OauthClient
            ): Cypress.Chainable<string>
            thirdPartyApiRequest<TData = unknown>(
                input: ThirdPartyApiRequestInput
            ): Cypress.Chainable<ThirdPartyApiRequestOutput<TData>>

            // GraphQL intercept commands
            interceptGraphQL(): void

            // Accessibility Commands
            checkA11yWithWcag22aa(): void
        }
    }
}
