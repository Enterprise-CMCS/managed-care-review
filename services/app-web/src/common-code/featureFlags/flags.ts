/*
 * Contains a list of all our feature flags in Launch Darkly. This is used to give us type safety
 * around flag names when we're enabling/disabling features in our code.
 */
export const featureFlags = {
    /**
     * Toggles the /health api endpoint
     */
    API_ENABLE_HEALTH_ENDPOINT: 'enable-health-endpoint',

    /**
     * Displays a banner in the frontend dashboard. Added for testing React integration with LD.
     */
    REACT_TEST_FRONTEND_BANNER: 'test-frontend-banner',
}
