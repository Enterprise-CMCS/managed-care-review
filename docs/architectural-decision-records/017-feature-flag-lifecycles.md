# Feature Flag Lifecycles

## Criteria for when a feature should be behind a flag

A feature typically can be added behind a flag if:

-   The entire feature isn't ready for production, but we want to ship parts of it for testing.

    -   Example: We're implementing CMS dashboard and after some user research we realize we need to change some backend resolvers. We can put this new code path behind a flag so the current UI continues to work while developers can access the new API responses while developing the new UI.

-   We want to show functionality to some users, but not others

    -   Example: We want to test a new document uploading workflow with a few states, but not for everyone in production. We’d put this behind a feature flag with a user segmentation set to the states we’re targeting for feedback.

-   We are unsure of performance characteristics of a feature and need to gather data

    -   Example: A new virus scanning lambda has been created, but we want to see if real world performance is better than what we have. We use a feature flag to scan some percentage of file uploads with the new lambda to gather metrics.

-   A/B testing of a feature

## How to add a flag to the codebase

Flags are first added to Launch Darkly via their UI. As an authenticated Launch Darkly user, navigate to our feature flags and click “create flag”. Choose a human readable flag name and a ‘-’ delimited flag key. The flag key is what we use inside our code. Make sure to mark the flag as client side if it is meant to be user visible (rather than API only). If the flag is permanent, mark this as well.

We keep a list of flags in a constants file in `app-web/src/common-code/featureFlags` and all new flags must be added to this file. For example, if you added a flag key of ‘new-testing-flag’ with a default value, you’d add it to the file as follows:

```typescript
export const featureFlags = {
    /**
     *  Toggles the $blank feature for testing
     */
    NEW_TESTING_FLAG: {
        flag: 'new-testing-flag',
        defaultValue: true
    },
}
```

You can then use it by passing it to the variation method of the launch darkly client, for example:

```typescript
import { featureFlags } from '../../common-code/featureFlags'

…

    const ldClient = useLDClient()
    const newTestFlag = ldClient?.variation(
            featureFlags.NEW_TESTING_FLAG.flag,
            featureFlags.NEW_TESTING_FLAG.defaultValue
    )
```

## Removing a flag from the codebase

Launch Darkly offers [code monitoring tools](https://docs.launchdarkly.com/home/code/code-references) to make removal of unused flags easier. Unfortunately, these are only offered to Enterprise plan subscribers, so this leaves flag monitoring [up to our team](https://docs.launchdarkly.com/guides/best-practices/technical-debt). We should schedule regular flag reviews as part of our sprint cadence to make sure we’re not keeping flags around that are no longer needed.

To remove an unused flag, first remove it from the `common-code/featureFlags` file. You should now be able to use your editor/IDE (or build errors) to find the place(s) that the variation call should be removed.

Once the flag has been removed from code, you’ll need to archive it in the Launch Darkly UI. This can be found under ‘Feature Flags > $flag-name > Settings` in the UI.

## Feature Flag Unit Testing

## Feature Flag Cypress Testing
Currently, there is no out of the box Cypress integration with LaunchDarkly. Our implementation approach enables the testing of multiple flag values independent of what is set in LaunchDarkly by intercepting api calls and returning our own generated flag values. This allows us to dynamically tests UI in Cypress with different flag values without having to modify flag values in the LaunchDarkly dashboard.

The implementation is heavily relent on the data and generated Types in `flags.ts` located in `app-web/src/common-code/featureFlags`. This is done for several reasons:
- Centralize feature flag lists so when adding new flags it only needs to be done once.
- Auto generated Types based on the feature flag list help removes the need to update types manually and throughout the codebase.
- Autocompletion of flag parameters to prevent mistakes and invalid flags when using custom LaunchDarkly Cypress commands.
- Type checking in custom LaunchDarkly Cypress commands.

Overall this improves development time of UI tests behind feature flags.

###Feature flag state management in Cypress
Our custom Launch Darkly commands intercepts feature flag value requests and returns our own values we feed to the commands. Then the application code will be able to access those custom values, but we also needed a way access them with in Cypress throughout the tests. Specifically to determine when to test UI behind a feature flag.

The approach here was to implement state management that could be accessed though Cypress. Integrating `cy.readFile` and `cy.writeFile` into the Launch Darkly helper commands.

The Cypress commands `cy.interceptFeatureFlags` and `cy.stubFeatureFlags` will generate a json file, using `Cy.writeFile`, in `tests/cypress/fixtures/stores/` named `featureFlagStore.json` using data and Types from `flag.ts` located in `app-web/src/common-code/featureFlags`. The `cy.getFeatureFlagStore()`, using `cy.write`, is used to read the `featureFlagStore.json` file and return the object of feature flags with values.

###LaunchDarkly Cypress helper commands
- **_interceptFeatureFlags_**: This command allows you to intercept LD calls and set flag values. It also generates a `featureFlagStore.json` file in `tests/cypress/fixtures/stores` with default feature flag values along with any specific values passed in.
  ```typescript
    //Intercept feature flag with flag values.
    cy.interceptFeatureFlags({
        'rate-certification-programs': true,
        'modal-countdown-duration': 3
    })
  
    //Intercept feature flag with default flag values.
    cy.interceptFeatureFlags()
  ```
  

- **_stubFeatureFlags_**: This command intercepts all of LD api calls and returns our own response. This will remove the need for waiting on actual Launch Darkly API calls to return. This command is being used on all specs in `beforeEach` to intercept requests on each test, set up default feature flag values in `featureFlagStore.json` and reset the Launch Darkly feature flag store to default values before each test.
  ```typescript
    describe('rate details', () => {
        beforeEach(() => {
            cy.stubFeatureFlags()
        })
        it('some tests', () => {
            cy.interceptFeatureFlags({
                'rate-certification-programs': true,
            })      
        })
    })
  ```
  If you `cy.stubFeatureFlags` before each test, there is no need to `cy.interceptFeatureFlags()` to generate default values for feature flags.


- **_getFeatureFlagStore_**: This command reads the `featureFlagStore.json` and returns an object of the feature flag values. You can pass in an array of specific feature flags to return those values instead of the entire set of flags. It's important this command is only called after `stubFeatureFlags` or `interceptFeatureFlags` is called or Cypress will error trying finding the `featureFlagStore.json` file.
  ```typescript
    Cypress.Commands.add('fillOutNewRateCertification', () => {
        cy.wait(2000)
        cy.findByText('New rate certification').click()
        cy.findByText(
            'Certification of capitation rates specific to each rate cell'
        ).click()
        cy.wait(2000)
        cy.findByLabelText('Start date').type('02/29/2024')
        cy.findByLabelText('End date').type('02/28/2025')
        cy.findByLabelText('Date certified').type('03/01/2024')

        //Get current store of feature flags and run code behinde feature flags
        cy.getFeatureFlagStore(['rate-certification-programs']).then((store) => {
            //If this flag value is true, then it will test this code hidden behind the feature flag
            if (store['rate-certification-programs']) {
               cy.findByRole('combobox', { name: 'programs (required)' }).click({
                    force: true,
                })
               cy.findByText('PMAP').click()
            }
            cy.findByTestId('file-input-input').attachFile(
                'documents/trussel-guide.pdf'
            )
            cy.verifyDocumentsHaveNoErrors()
            cy.waitForDocumentsToLoad()
            cy.findAllByTestId('errorMessage').should('have.length', 0)
        })
    })
  ```

###Adding feature flags
Adding a new feature flag for testing is automatically done once you add the flag into list of flags in the `flags.ts` constants file located in `app-web/src/common-code/featureFlags`.

###Removing feature flags
Removing a feature flag is also automatically done once you remove the flag from the  list of flags in the `flags.ts`.
