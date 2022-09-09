/*
 * Contains a list of all our feature flags in Launch Darkly. This is used to give us type safety
 * around flag names when we're enabling/disabling features in our code.
 */
export const featureFlags = {
    /*
     Toggles the /health api endpoint
    */
    SITE_MAINTENANCE_BANNER: 'site-maintenance-banner',
    /*
     Toggles the /health api endpoint
    */
    API_ENABLE_HEALTH_ENDPOINT: 'enable-health-endpoint',
    /*
     Enables the modal that alerts the user to an expiring session
    */
    SESSION_EXPIRING_MODAL: 'session-expiring-modal',
    /*
     The number of minutes before the session expires
    */
    MINUTES_UNTIL_SESSION_EXPIRES: 'session-expiration-minutes',
    /*
     The number of minutes before session expiration that the warning modal appears
    */
    MODAL_COUNTDOWN_DURATION: 'modal-countdown-duration',
    /**
     * Graphql resolver returns 500 errors. Used for testing alerting in OTEL/New Relic
     */
    API_GRAPHQL_ERRORS: 'app-api-graphql-errors',
    /**
     * Enables selection of programs that apply to rate certification
     */
    RATE_CERT_PROGRAMS: 'rate-certification-programs',
} as const

export type FeatureFlagTypes = typeof featureFlags[keyof typeof featureFlags]

export type FlagValueTypes = boolean | string | number | object | []
