These implementations are heavily relent on the data and generated Types in `flags.ts` located in `app-web/src/common-code/featureFlags`. This is done for several reasons:
- Centralize feature flag lists so when adding new flags it only needs to be done once.
- Auto generated Types based on the feature flag list help removes the need to update types manually and throughout the codebase.
- Autocompletion of flag parameters to prevent mistakes and invalid flags when using the implementations.

### Prerequisites
Before testing locally, make sure to have the following prerequisites.

- Launch Darkly API key: A valid Launch Darkly API key will need to be your `.envrc.local`, see code block below. Cypress will be making the actual request to Launch Darkly, we will just be intercepting the response. If we had an invalid key here, the request to would return a 404 before we could intercept the response. **This will cause the integration to break in testing.**
```json
export REACT_APP_LD_CLIENT_ID='Place Launch Darkly ID here'
export LD_SDK_KEY='Place Launch Darkly SDK key here'
```

## Feature Flag Unit Testing
The implementation of LaunchDarkly in our unit testing is split


## Feature Flag Cypress Testing
Currently, there is no out of the box Cypress integration with LaunchDarkly. Our implementation approach enables the testing of multiple flag values independent of what is set in LaunchDarkly by intercepting api calls and returning our own generated flag values. This allows us to dynamically tests UI in Cypress with different flag values without having to modify flag values in the LaunchDarkly dashboard.

### Feature flag state management in Cypress
Our custom Launch Darkly commands intercepts feature flag value requests and returns our own values we feed to the commands. Then the application code will be able to access those custom values, but we also needed a way access them with in Cypress throughout the tests. Specifically to determine when to test UI behind a feature flag.

The approach here was to implement state management that could be accessed though Cypress. Integrating `cy.readFile` and `cy.writeFile` into the Launch Darkly helper commands.

The Cypress commands `cy.interceptFeatureFlags` and `cy.stubFeatureFlags` will generate a json file, using `Cy.writeFile`, in `tests/cypress/fixtures/stores/` named `featureFlagStore.json` using data and Types from `flag.ts` located in `app-web/src/common-code/featureFlags`. The `cy.getFeatureFlagStore()`, using `cy.write`, is used to read the `featureFlagStore.json` file and return the object of feature flags with values.

### LaunchDarkly Cypress helper commands
- #### interceptFeatureFlags
  This command allows you to intercept LD calls and set flag values. It also generates a `featureFlagStore.json` file in `tests/cypress/fixtures/stores` with default feature flag values along with any specific values passed in.
  ```typescript
    //Intercept feature flag with flag values.
    cy.interceptFeatureFlags({
        'rate-certification-programs': true,
        'modal-countdown-duration': 3
    })
  
    //Intercept feature flag with default flag values.
    cy.interceptFeatureFlags()
  ```


- #### stubFeatureFlags
  This command intercepts all of LD api calls and returns our own response. This will remove the need for waiting on actual Launch Darkly API calls to return. This command is being used on all specs in `beforeEach` to intercept requests on each test, set up default feature flag values in `featureFlagStore.json` and reset the Launch Darkly feature flag store to default values before each test.
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


- #### getFeatureFlagStore
  This command reads the `featureFlagStore.json` and returns an object of the feature flag values. You can pass in an array of specific feature flags to return those values instead of the entire set of flags. It's important this command is only called after `stubFeatureFlags` or `interceptFeatureFlags` is called or Cypress will error trying finding the `featureFlagStore.json` file.
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

### Adding feature flags
Adding a new feature flag for testing is automatically done once you add the flag into list of flags in the `flags.ts` constants file located in `app-web/src/common-code/featureFlags`.

### Removing feature flags
Removing a feature flag is also automatically done once you remove the flag from the  list of flags in the `flags.ts`.
