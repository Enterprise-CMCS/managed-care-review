import '@testing-library/cypress/add-commands'

import {
    FeatureFlagLDConstant,
    FeatureFlagSettings,
    featureFlags,
    FlagValue,
    featureFlagKeys,
} from '@mc-review/common-code'

/**
 * interceptFeatureFlags applies supplied values over the Cypress suite
 * defaults. Flags without a Cypress default use their defaults from
 * common-code.
 *
 * The code below was taken from this blog post and modified a bit for our use of Types in feature flags.
 * https://dev.to/muratkeremozcan/effective-test-strategies-for-testing-front-end-applications-using-launchdarkly-feature-flags-and-cypress-part2-testing-2c72#stubbing-a-feature-flag
 *
 */

const cypressFeatureFlagDefaults: FeatureFlagSettings = {
    'hide-supporting-docs-page': true,
    dsnp: true,
    'cms-user-undo-unlock': true,
    'contact-data-model-update': true,
}

// Intercepting LD "GET" calls for feature flag values and returns our default flags and values.
Cypress.Commands.add(
    'interceptFeatureFlags',
    (toggleFlags?: FeatureFlagSettings) => {
        // Build the complete LaunchDarkly response from explicit overrides,
        // Cypress suite defaults, and finally common-code defaults. The
        // complete object is required by the client SDK and getFeatureFlagStore.
        const featureFlagObject: FeatureFlagSettings = {}

        featureFlagKeys.forEach((flagEnum) => {
            const key: FeatureFlagLDConstant = featureFlags[flagEnum].flag
            const value =
                toggleFlags?.[key] ??
                cypressFeatureFlagDefaults[key] ??
                featureFlags[flagEnum].defaultValue

            featureFlagObject[key] = { value }
        })

        //Writing feature flags and values to store.
        cy.writeFile(
            'fixtures/stores/featureFlagStore.json',
            JSON.stringify(featureFlagObject)
        )

        const clientSDKMatchers =
            Cypress.env('AUTH_MODE') === 'LOCAL'
                ? { method: 'GET', pathname: /^\/ld-clientsdk(\/.*)?$/ }
                : { method: 'GET', hostname: /\.*clientsdk\.launchdarkly\.us/ }

        // Intercepts LD request and returns with our own feature flags and values.
        return cy
            .intercept(clientSDKMatchers, { body: featureFlagObject })
            .as('LDApp')
    }
)

// Intercepting feature flag api calls and returns some response. This should stop the app from calling making requests to LD.
Cypress.Commands.add('stubFeatureFlags', () => {
    // ignore api calls to events endpoint
    const eventMatchers =
        Cypress.env('AUTH_MODE') === 'LOCAL'
            ? { method: 'POST', pathname: /^\/ld-events(\/.*)?$/ }
            : { method: 'POST', hostname: /\.*events\.launchdarkly\.us/ }

    cy.intercept(
        eventMatchers,
        // { body: {} }
        (req) => {
            req.on('response', (res) => {
                res.setDelay(15000)
            })
            req.reply({ body: {} })
        }
    ).as('LDEvents')

    const clientStreamMatchers =
        Cypress.env('AUTH_MODE') === 'LOCAL'
            ? { method: 'GET', pathname: /^\/ld-clientstream(\/.*)?$/ }
            : { method: 'GET', hostname: /\.*clientstream\.launchdarkly\.us/ }

    // turn off push updates from LaunchDarkly (EventSource)
    cy.intercept(
        clientStreamMatchers,
        // access the request handler and stub a response
        (req) => {
            req.on('response', (res) => {
                res.setDelay(15000)
            })
            req.reply('data: no streaming feature flag data here\n\n', {
                'content-type': 'text/event-stream; charset=utf-8',
            })
        }
    ).as('LDClientStream')

    /**
     * Setting default values for flags for Cypress E2E tests.
     * Useful if you want default feature flags for tests that are different than default values set in common-code featureFlags
     **/
    cy.interceptFeatureFlags(cypressFeatureFlagDefaults)
})

//Command to get feature flag values from the featureFlagStore.json file.
Cypress.Commands.add(
    'getFeatureFlagStore',
    (featureFlags?: FeatureFlagLDConstant[]) => {
        return cy
            .readFile('fixtures/stores/featureFlagStore.json')
            .then(
                (
                    store: Record<FeatureFlagLDConstant, { value: FlagValue }>
                ): FeatureFlagSettings => {
                    if (featureFlags && featureFlags.length) {
                        const selectedFlags: FeatureFlagSettings = {}
                        featureFlags.forEach((flag) => {
                            selectedFlags[flag] = store[flag].value
                        })
                        return selectedFlags
                    }
                    return store
                }
            )
    }
)
