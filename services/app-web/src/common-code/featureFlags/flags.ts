/**
 * Contains a list of all our feature flags in Launch Darkly each flag should contain a default value. This is used to
 * give us type safety around flag names when we're enabling/disabling features in our code.
 *
 * This list is also used to generate Types for our Unit and Cypress tests. Our Cypress LD integration heavily relies
 * on this list to help constrain tests to flag's in LD, autocompletion, generate Types and flag state management
 */

export const featureFlags = {
    /**
     Toggles the site maintenance alert on the landing page
    */
    SITE_MAINTENANCE_BANNER: {
        flag: 'site-maintenance-banner',
        defaultValue: false,
    },
    /**
     Toggles the /health api endpoint
    */
    API_ENABLE_HEALTH_ENDPOINT: {
        flag: 'enable-health-endpoint',
        defaultValue: true,
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
     * Graphql resolver returns 500 errors. Used for testing alerting in OTEL/New Relic
     */
    API_GRAPHQL_ERRORS: {
        flag: 'app-api-graphql-errors',
        defaultValue: false,
    },
    /**
     * Enables multi-rate submission UI
     */
    MULTI_RATE_SUBMISSIONS: {
        flag: 'multi-rate-submissions',
        defaultValue: false,
    },
} as const

export type FlagEnumType = keyof typeof featureFlags

/**
 * featureFlags object top level property keys in an array. Used for LD integration into Cypress
 */
export const featureFlagEnums: FlagEnumType[] = Object.keys(featureFlags).map(
    (flag): keyof typeof featureFlags => flag as FlagEnumType
)

/**
 * Get a union type of all `flag` values of `featureFlags`. This type will constrain code to only use feature flags defined
 * in the featureFlag object. Mainly used in testing to restrict testing to actual feature flags.
 */
export type FeatureFlagTypes =
    typeof featureFlags[keyof typeof featureFlags]['flag']

/**
 * Flag value types from Launch Darkly and used to restrict feature flag default types as well as values in testing.
 */
export type FlagValueTypes = boolean | string | number | object | []
