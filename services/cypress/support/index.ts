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
import {CmsUsersUnion, Contract, HealthPlanPackage, StateUser, Division} from '../gen/gqlClient'
import { UnlockedHealthPlanFormDataType } from '@mc-review/hpp'
import { CMSUserLoginNames } from './loginCommands'

type FormButtonKey =
    | 'CONTINUE_FROM_START_NEW'
    | 'CONTINUE'
    | 'SAVE_DRAFT'
    | 'BACK'

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

            // submission review commands
            unlockSubmission(unlockReason?: string): void

            // navigate commands
            deprecatedNavigateV1Form(
                buttonName: FormButtonKey,
                waitForLoad?: boolean
            ): void
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
            ): Promise<FeatureFlagSettings>

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
                stateUser: StateUser
            ): Cypress.Chainable<Contract>
            apiCreateAndSubmitContractWithRates(
                stateUser: StateUser
            ): Cypress.Chainable<Contract>
            apiDeprecatedCreateSubmitHPP(
                stateUser: StateUser,
                formData?: Partial<UnlockedHealthPlanFormDataType>
            ): Cypress.Chainable<HealthPlanPackage>
            apiCreateAndSubmitBaseContract(
                stateUser: StateUser
            ): Cypress.Chainable<Contract>
            apiAssignDivisionToCMSUser(
                cmsUser: CmsUsersUnion,
                division: Division
            ): Cypress.Chainable<void>
            apiCreateAndSubmitContractWithRates(
                stateUser: StateUser
            ): Cypress.Chainable<Contract>

            // GraphQL intercept commands
            interceptGraphQL(): void

            // Accessibility Commands
            checkA11yWithWcag22aa(): void
        }
    }
}
