import '@testing-library/cypress/add-commands'

import {
    FeatureFlagLDConstant,
    FeatureFlagSettings,
    featureFlags,
    FlagValue,
    featureFlagKeys,
} from '../../app-web/src/common-code/featureFlags/flags'

/**
 * interceptFeatureFlags sets the flag to what is passed into it and sets other flags to default values.
 * Passing in an empty object will default all flags.
 *
 * The code below was taken from this blog post and modified a bit for our use of Types in feature flags.
 * https://dev.to/muratkeremozcan/effective-test-strategies-for-testing-front-end-applications-using-launchdarkly-feature-flags-and-cypress-part2-testing-2c72#stubbing-a-feature-flag
 *
 */

// Intercepting LD "GET" calls for feature flag values and returns our default flags and values.
Cypress.Commands.add(
    'interceptFeatureFlags',
    (toggleFlags?: FeatureFlagSettings) => {
        // Create feature flag object with default values and update values of flags passed in toggleFlags argument.
        // defaultFeatureFlags contains all valid feature flags along with default values. toggleFlags is restricted to flag's
        // contained in app-web/src/common-code/featureFlags/flags.ts.
        const featureFlagObject: FeatureFlagSettings = {}

        featureFlagKeys.forEach((flagEnum) => {
            let key: FeatureFlagLDConstant = featureFlags[flagEnum].flag
            let value =
                toggleFlags && toggleFlags[key]
                    ? toggleFlags[key]
                    : featureFlags[flagEnum].defaultValue
            featureFlagObject[key] = { value }
        })

        //Writing feature flags and values to store.
        cy.writeFile(
            'fixtures/stores/featureFlagStore.json',
            JSON.stringify(featureFlagObject)
        )

        // Intercepts LD request and returns with our own feature flags and values.
        return cy
            .intercept(
                { method: 'GET', hostname: /\.*clientsdk\.launchdarkly\.us/ },
                { body: featureFlagObject }
            )
            .as('LDApp')
    }
)

// Intercepting feature flag api calls and returns some response. This should stop the app from calling making requests to LD.
Cypress.Commands.add('stubFeatureFlags', () => {
    // ignore api calls to events endpoint
    cy.intercept(
        { method: 'POST', hostname: /\.*events\.launchdarkly\.us/ },
        // { body: {} }
        (req) => {
            req.on('response', (res) => {
                res.setDelay(60000)
            })
            req.reply({ body: {} })
        }
    ).as('LDEvents')

    // turn off push updates from LaunchDarkly (EventSource)
    cy.intercept(
        { method: 'GET', hostname: /\.*clientstream\.launchdarkly\.us/ },
        // access the request handler and stub a response
        (req) => {
            req.on('response', (res) => {
                res.setDelay(60000)
            })
            req.reply('data: no streaming feature flag data here\n\n', {
                'content-type': 'text/event-stream; charset=utf-8',
            })
        }
    ).as('LDClientStream')

    /**
     * Setting default values for flags for Cypress E2E tests. Only call `interceptFeatureFlags` once.
     * Useful if you want default feature flags for tests that are different than default values set in common-code featureFlags
     **/
    cy.interceptFeatureFlags({
        'packages-with-shared-rates': true,
        'rates-db-refactor': true,
        'supporting-docs-by-rate': true,
        '438-attestation': true
    })
})

//Command to get feature flag values from the featureFlagStore.json file.
Cypress.Commands.add(
    'getFeatureFlagStore',
    (featureFlags?: FeatureFlagLDConstant[]) => {
        cy.readFile('fixtures/stores/featureFlagStore.json').then(
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
