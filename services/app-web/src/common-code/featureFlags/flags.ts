/**
 * Source of truth for feature flags in application.
 * Ensures some type safety around flag names when we're enabling/disabling features in our code.
 *
 * This file also used to generate types for our Jest unit tests, Cypress tests, and for Yup validation logic.
 */

const featureFlags = {
    /**
     Toggles the site maintenance alert on the landing page
    */
    SITE_UNDER_MAINTENANCE_BANNER: {
        flag: 'site-under-maintenance-banner',
        defaultValue: 'OFF',
    },
    /**
     Enables the modal that alerts the user to an expiring session
    */
    SESSION_EXPIRING_MODAL: {
        flag: 'session-expiring-modal',
        defaultValue: true,
    },
    /**
     The number of minutes before the session expires
    */
    MINUTES_UNTIL_SESSION_EXPIRES: {
        flag: 'session-expiration-minutes',
        defaultValue: 30,
    },
    /**
     The number of minutes before session expiration that the warning modal appears
    */
    MODAL_COUNTDOWN_DURATION: {
        flag: 'modal-countdown-duration',
        defaultValue: 2,
    },
    /**
     * Enables state and CMS Q&A features
     */
    CMS_QUESTIONS: {
        flag: 'cms-questions',
        defaultValue: false,
    },
    /**
     * Enables packages with shared rates dropdown on rate details page. This was an early version of rates across subs functionality.
     */
    PACKAGES_WITH_SHARED_RATES: {
        flag: 'packages-with-shared-rates',
        defaultValue: false,
    },
    /**
     * Enables supporting documents to be associated with a specific rate certification on the Rate Details page
     */
    SUPPORTING_DOCS_BY_RATE: {
        flag: 'supporting-docs-by-rate',
        defaultValue: false,
    },
    /**
     * Controls the rates review dashboard UI. This flag should not be turned on without rates-db-refactor also on.
     */
    RATE_REVIEWS_DASHBOARD: {
        flag: 'rate-reviews-dashboard',
        defaultValue: false,
    },
    /**
     * Controls the rates filter UI/ This flag should not be turned on without rate-reviews-dashboard also on.
     */
    RATE_FILTERS: {
        flag: 'rate-filters',
        defaultValue: false,
    },
    CONTRACT_438_ATTESTATION: {
        flag: '438-attestation',
        defaultValue: false,
    },
    /**
     * Used in testing to simulate errors in fetching flag value.
     * This flag does not exist in LaunchDarkly dashboard so fetching this will return the defaultValue.
     */
    TEST_ERROR_FETCHING_FLAG: {
        flag: 'test-error-fetching-flag',
        defaultValue: undefined,
    },
    /*
    Temporary flag for the cutover to a new support email address
    */
    HELPDESK_EMAIL: {
        flag: 'helpdesk-email',
        defaultValue: false,
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
