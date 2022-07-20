/*
 * Contains a list of all our feature flags in Launch Darkly. This is used to give us type safety
 * around flag names when we're enabling/disabling features in our code.
 */
export const featureFlags = {
    /*
     Toggles the /health api endpoint
    */
    API_ENABLE_HEALTH_ENDPOINT: 'enable-health-endpoint',
    /*
     Toggles the CMS dashboard view
    */
    CMS_DASHBOARD: 'enable-health-endpoint',
    /*
     Displays a banner in the frontend dashboard. Added for testing React integration with LD.
    */
    REACT_TEST_FRONTEND_BANNER: 'test-frontend-banner',
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
}
