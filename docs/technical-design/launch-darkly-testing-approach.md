These implementations are heavily relent on the data and generated Types in `flags.ts` located in `app-web/src/common-code/featureFlags`. This is done for several reasons:
- Centralize feature flag lists so when adding new flags it only needs to be done once.
- Auto generated Types based on the feature flag list help removes the need to update types manually and throughout the codebase.
- Autocompletion of flag parameters to prevent mistakes and invalid flags when using the implementations.

### Prerequisites
Before testing locally, make sure to have the following prerequisites.

- **Launch Darkly API key**: A valid Launch Darkly API key will need to be in your `.envrc.local`, see code block below. Cypress will be making the actual request to Launch Darkly, we will just be intercepting the response. If we had an invalid key here, the request to would return a 404 before we could intercept the response. **This will cause the integration to break in testing.**
- **Launch Darkly SDK key**: A valid Launch Darkly SDK key can be in your `.envrc.local`, see code block below. Without this SDK key, the API implementation of LaunchDarkly will fall back to using `offlineLDService()`, which uses `defaultValue` of each flag. The `defaultValue` of flags are generated using `flags.ts` located in `app-web/src/common-code/featureFlags`.
```json
export REACT_APP_LD_CLIENT_ID='Place Launch Darkly ID here'
export LD_SDK_KEY='Place Launch Darkly SDK key here'
```

## Feature Flag Unit Testing

### Client side unit testing
Client side unit testing utilizes `jest.spyOn()` to mock the LaunchDarkly `useLDClient` hook and return default flag values or values specified. This implementation is done in our jest helper function `ldUseClientSpy()` located in `app-web/src/testHelpers/jestHelpers.tsx`.

`ldUseClientSpy` takes in an object of feature flags and values as an argument. You can configure multiple flags with the object passed into `ldUseClientSpy`.

```javascript
ldUseClientSpy({
  'rates-across-submissions': true,
  'rate-cert-assurance': true,
})
```

To configure feature flags for a single test place `ldUseClientSpy` at the beginning of your test. 

```javascript
it('cannot continue if no documents are added to the second rate', async () => {
    ldUseClientSpy({ 'rates-across-submissions': true })
    const mockUpdateDraftFn = jest.fn()
    renderWithProviders(
        <RateDetails
            draftSubmission={emptyRateDetailsDraft}
            updateDraft={mockUpdateDraftFn}
            previousDocuments={[]}
        />,
        {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        }
    )
  
    ...
})
```

To configure multiple tests inside a `describe` block you can: 
- Follow the method for single tests on each test.
- If all the tests require the same flag configuration place `ldUseClientSpy` at the top of the block in `beforeEach()`.

```javascript
describe('rates across submissions', () => {
    beforeEach(() =>
        ldUseClientSpy({
          'rates-across-submissions': true,
        })
    )
    afterEach(() => {
        jest.clearAllMocks()
    })
  
    ...
})
```

With either one of these methods it's always best to `jest.clearAllMocks()` after each test. This is required for described block example with mixed flag values, otherwise, test may have flags configured not in the intended way.

### Server side unit testing
LaunchDarkly server side implementation is done with configuring our resolvers with `ldService` dependency. In our resolver we then can use the method `getFeatureFlag` from `ldService` to get the flag value from LaunchDarkly.

The unit testing implementation uses a test version of the `ldService` dependency called `testLDService` located in `app-api/src/testHelpers/launchDarklyHelpers.ts`. 

`testLDService` takes in an object of feature flags and values as an argument which is used to return flag value when `getFeatureFlag` is called in the resolver. If no feature flag object is passed in, then the function will use default values to return.

```typescript
  function testLDService(
      mockFeatureFlags?: Partial<FeatureFlagObject>
  ): LDService {
      const featureFlags = defaultFeatureFlags

      //Update featureFlags with mock flag values.
      if (mockFeatureFlags) {
        for (const flag in mockFeatureFlags) {
          const featureFlag = flag as FeatureFlagTypes
          featureFlags[featureFlag] = mockFeatureFlags[
                  featureFlag
                  ] as FlagValueTypes
        }
      }

      return {
        getFeatureFlag: async (user, flag) => featureFlags[flag],
      }
  }
```

We then pass `testLDService` with our defined values for a flag into `constructTestPostgresServer` when setting up test server. Resolvers in the test will now use `testLDService` when calling `getFeatureFlag` returning our defined feature flag values.

```javascript
it('does not error when risk based question is undefined and rate-cert-assurance feature flag is off', async () => {
    const mockLDService = testLDService({'rate-cert-assurance': false})
    const server = await constructTestPostgresServer({ 
      ldService: mockLDService,
    })

    // setup
    const initialPkg = await createAndUpdateTestHealthPlanPackage(server, {
      riskBasedContract: undefined,
    })
  
    ...
})
```

## Feature Flag Cypress Testing
Currently, there is no out of the box Cypress integration with LaunchDarkly. Our implementation approach enables the testing of multiple flag values independent of what is set in LaunchDarkly by intercepting api calls and returning our own generated flag values. This allows us to dynamically tests UI in Cypress with different flag values without having to modify flag values in the LaunchDarkly dashboard.

### Limitations
Implementations of LaunchDarkly in Cypress testing are not actually connecting to LaunchDarkly instead are defining our own flag values when testing. There is one major limitation to this implementation, server side and client side flag value syncing in Cypress runs. Since we are not reaching out to LaunchDarkly to either retrieve or set a flag value the server side does not know we have changed a flags value. In this scenario the same flag would be in different states between client and server. 

For example, we have some logic on the server side that checks a submission for completion on a new field. This check is behind a feature flag. So if the flag is off, then the check does not happen. Simultaneously on the client side this same flag controls the display of the UI that allows users to fill out this new field. The issue now lies in our Cypress test, we can test client side with this UI disabled for a specific user, but on server side it may be enabled by default for that user and this test will fail because the flag values are now out of sync.

There are a couple solutions for this:
- We default all tests that run into check to have the flag on. In the example above, all tests that will hit this test will have the UI enabled.
  - This is already being done for the time being. 
  - Drawbacks:
    - I could see issues in the future when dealing with complex features behind a flag.
- We use specific users for these types of tests, where client and server flags must be synced. In the example above, we use `Toph` to test server side feature flags off and `Aang` for serverside feature flags on.
  - The existing code will have to handle account switching for tests as different states have their own data like programs.
  - Drawbacks:
    - Cypress code may get complicated because switching of accounts. Currently, the issue is only on selecting programs as programs are specific to a state, but there may be more features down the road that will complicate this.
- We switch this with a different implementation that actually calls out to LaunchDarkly to retrieve or set a flag value. [cypress-id-control](https://github.com/bahmutov/cypress-ld-control) looks like a promising library that does this.
  - This would solve the issue with syncing, since we would be calling out to LaunchDarkly to set our flag values.
  - Drawbacks:
    - We are making actual request to LaunchDarkly for every cypress run which may matter if we are limited in number requests. Before the implementation with request stubbing we were consistently over the limit on requests.
    - We are not completely sure we can even make calls out to LaunchDarkly from the cypress code.
    - Changing the flag values in LaunchDarkly may interrupt/break other Cypress CI or manual tests.
    - This would require the most work.

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

## Adding and removing feature flags
Adding a new feature flag for testing is automatically done once you add the flag into list of flags in the `flags.ts` constants file located in `app-web/src/common-code/featureFlags`. Removing the flag from `flags.ts` can be done by removing it from the list. **For testing purposes we should not be removing or adding feature flags specifically for testing.**

