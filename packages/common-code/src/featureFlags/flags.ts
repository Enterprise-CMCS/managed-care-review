/**
 * Source of truth for feature flags in application.
 * Ensures some type safety around flag names when we're enabling/disabling features in our code.
 *
 * This file also used to generate types for our Jest unit tests, Cypress tests, and for Yup validation logic.
 *
 * Default values are set to match PROD.
 */

const featureFlags = {
    CONTRACT_438_ATTESTATION: {
        flag: '438-attestation',
        defaultValue: false,
    },
    /**
     * When enabled state users will not see a standalone supporting
     * docs page
     */
    HIDE_SUPPORTING_DOCS_PAGE: {
        flag: 'hide-supporting-docs-page',
        defaultValue: true,
    },
    /**
     * Enables state and CMS rate edit, unlock, resubmit functionality
     */
    RATE_EDIT_UNLOCK: {
        flag: 'rate-edit-unlock',
        defaultValue: false,
    },
    /**
     * Enables SDP functionality for state
     */
    SDP: {
        flag: 'sdp',
        defaultValue: false,
    },
    /**
     * Enables D-SNP functionality for state and CMS
     */
    DSNP: {
        flag: 'dsnp',
        defaultValue: true,
    },
    /**
     * Enables undo withdraw rate feature
     */
    UNDO_WITHDRAW_RATE: {
        flag: 'undo-withdraw-rate',
        defaultValue: true,
    },
    /**
     * Remove parameter store. False: use parameter store for email config. True: use database.
     */
    REMOVE_PARAMETER_STORE: {
        flag: 'remove-parameter-store',
        defaultValue: true,
    },
    /**
     * Enables withdraw submission features
     */
    WITHDRAW_SUBMISSION: {
        flag: 'withdraw-submission',
        defaultValue: true,
    },
    /**
     * Enables undo withdraw submission features
     */
    UNDO_WITHDRAW_SUBMISSION: {
        flag: 'undo-withdraw-submission',
        defaultValue: true,
    },
    /**
     * Enables EQRO submissions page
     */
    EQRO_SUBMISSIONS: {
        flag: 'eqro-submissions',
        defaultValue: false,
    },
    /**
     * This flag toggles CHIP only health plan submission review automation.
     */
    CHIP_SUBMISSION_AUTOMATION: {
        flag: 'chip-submission-automation',
        defaultValue: true,
    },
    /**
     * Uses stored contract action dates for contract lastUpdatedForDisplay and updatedWithin filtering.
     */
    USE_STORED_CONTRACT_ACTION_DATES: {
        flag: 'use-stored-contract-action-dates',
        defaultValue: false,
    },
    /**
     * This flag toggles availability of resources navigation bar and related pages.
     */
    RESOURCES_NAV_PAGES: {
        flag: 'resources-nav-pages',
        defaultValue: true,
    },
    // PERMANENT FLAGS for utilities not flagging features
    /**
     * This flag toggles the ability for external API users to send write requests.
     */
    EXTERNAL_API_WRITE_REQUEST: {
        flag: 'external-api-write-request',
        defaultValue: false,
    },
    /**
     Enables the modal that alerts the user to an expiring session
    */
    SESSION_EXPIRING_MODAL: {
        flag: 'session-expiring-modal',
        defaultValue: true,
    },
    MINUTES_UNTIL_SESSION_EXPIRES: {
        flag: 'session-expiration-minutes',
        defaultValue: 30,
    },
    /**
     Toggles the site maintenance alert on the landing page
    */
    SITE_UNDER_MAINTENANCE_BANNER: {
        flag: 'site-under-maintenance-banner',
        defaultValue: 'OFF',
    },
} as const

/**
 * Feature flags constants used in application. Uppercased and snake_cased
 */
const featureFlagKeys = Object.keys(featureFlags).map(
    (flag): keyof typeof featureFlags => flag as FlagKey
)

/**
 * Feature flag constants used in Launch Darkly. Lowercased and kebab-cased
 */
type FeatureFlagLDConstant =
    (typeof featureFlags)[keyof typeof featureFlags]['flag']

type FlagKey = keyof typeof featureFlags
type FlagValue = boolean | string | number | object | [] // this is  an approximate mapping to available LD flag value types

type FeatureFlagSettings = Partial<Record<FeatureFlagLDConstant, FlagValue>>

export type { FlagKey, FlagValue, FeatureFlagLDConstant, FeatureFlagSettings }

export { featureFlagKeys, featureFlags }
