These implementations are heavily reliant on the data and generated Types in `flags.ts` located in `app-web/src/common-code/featureFlags`. This is done for several reasons:
- Centralize feature flag lists so when adding new flags it only needs to be done once.
- Auto generated Types based on the feature flag list help remove the need to update types manually and throughout the codebase.
- Autocompletion of flag parameters to prevent mistakes and invalid flags when using the implementations.

### Prerequisites for local testing
Before testing locally, make sure to have the following prerequisites.

- **LaunchDarkly Client-side ID key**: A valid LaunchDarkly Client-side ID key will need to be in your `.envrc.local`, see code block below. Cypress will be making the actual request to LaunchDarkly, we will just be intercepting the response. If we had an invalid key here, the request would return a 404 before we could intercept the response, **which will cause the integration to break in testing.**
- **LaunchDarkly SDK key**: A valid LaunchDarkly SDK key can be in your `.envrc.local`, see code block below. Without this SDK key, the API implementation of LaunchDarkly will fall back to using `offlineLDService()`, which uses `defaultValue` of each flag. The `defaultValue` of flags are generated using `flags.ts` located in `app-web/src/common-code/featureFlags`.
```json
export REACT_APP_LD_CLIENT_ID='Place Launch Darkly ID here'
export LD_SDK_KEY='Place Launch Darkly SDK key here'
```
- **Getting LaunchDarkly Client-side ID and SDK keys**:
  - Log into [LaunchDarkly](https://app.launchdarkly.us). To login use trussworks email (e.g. `@teamtrussworks.com`) and any password, which will redirect you to CMS SSO login.
  - On the dashboard page click on `Account settings` tab form the side navigation.
  - Then, on the `Account settings` page, click on the `Projects` tab.
  - You should see a `Projects` table. Select the project 'macpro-mc-review' from the table.
  - Finally, you should see a `Environments` table .
  - The keys for `Local` environment are the ones needed for local testing.

## Feature flag unit testing

### Client side unit testing
Client side unit testing utilizes the `LDProvider`, from `launchdarkly-react-client-sdk`, in our [renderWithProviders](../../services/app-web/src/testHelpers/jestHelpers.tsx) function to set up feature flags for each of the tests. Currently, LaunchDarkly does not provide an actual mock `LDProvider` so if or when they do, then we could update this with that provider.

We use this method for testing because the official documented [unit testing](https://docs.launchdarkly.com/guides/sdk/unit-tests/?q=unit+test) method by LaunchDarkly does not work with our LaunchDarkly implementation. Our implementation follow exactly the documentation, so it could be how we are setting up our unit tests. Previously we had used `jest.spyOn` to intercept `useLDClient` and mock the `useLDClient.variation()` function with our defined feature flag values. With `launchdarkly-react-client-sdk@3.0.10` that method did not work anymore.

#### Configuration
When using the `LDProvider` we need to pass in a mocked `ldClient` in the configuration. This allows us to initialize `ldClient` outside of the provider, which would have required the provider to perform an API call to LaunchDarkly. Now that this API call does not happen it isolates our unit tests from the feature flag values on the LaunchDarkly server and only use the values we define in each test.

The configuration below, in `renderWithProviders`, the `ldClient` field is how we initialize `ldClient` with our defined flag values. We are using the `ldClientMock()` function to generate a mock that matches the type this field requires. 

You will also see that, compared to our configuration in [app-web/src/index.tsx](../../services/app-web/src/index.tsx), the config needed to connect to LaunchDarkly is replaced with `test-url`.

```typescript
const ldProviderConfig: ProviderConfig = {
  clientSideID: 'test-url',
  options: {
    bootstrap: flags,
    baseUrl: 'test-url',
    streamUrl: 'test-url',
    eventsUrl: 'test-url',
  },
  ldClient: ldClientMock(flags)
}
```

The two important functions in the `ldCientMock` are `variation` and `allFlags`. These two functions are the ones we use in the app to get feature flags and here we are mocking them with the flag values we define in each test. If we need any other functions in `ldClient` we would just add the mock to `ldClientMock()`.

```javascript
const ldClientMock = (featureFlags: FeatureFlagSettings): LDClient => ({
  ... other functions,
  variation: jest.fn(
    (
      flag: FeatureFlagLDConstant,
      defaultValue: FlagValue | undefined
    ) => featureFlags[flag] ?? defaultValue
  ),
  allFlags: jest.fn(() => featureFlags),
})
```

We define our initial feature flag values in the `flags` variable by combining the default feature flag values with values passed into `renderWithProviders` for each test. Looking at the code snippet below from `renderWithProviders`, we get the default flag values from [flags.ts](../../services/app-web/src/common-code/featureFlags/flags.ts) using `getDefaultFeatureFlags()` then merge that with `option.featureFlags` values passed into `renderWithProviders`. This will allow each test to configure the specific feature flag values for that test and supply default values for flags the test did not define.

```typescript
const {
  routerProvider = {},
  apolloProvider = {},
  authProvider = {},
  s3Provider = undefined,
  location = undefined,
  featureFlags = undefined
} = options || {}

const flags = {
  ...getDefaultFeatureFlags(),
  ...featureFlags
}

const ldProviderConfig: ProviderConfig = {
  clientSideID: 'test-url',
  options: {
    bootstrap: flags,
    baseUrl: 'test-url',
    streamUrl: 'test-url',
    eventsUrl: 'test-url',
  },
  ldClient: ldClientMock(flags)
}
```

#### Examples

Using this method in our unit tests is simple and similar to how we configure the other providers. When calling `renderWithProdivers` we need to supply the second argument `options` with the `featureFlag` field. 

In the example below we set `featureFlag` with an object that contains two feature flags and their values. When this test is run, the component will be supplied with these two flag values along with the other default flag values from [flags.ts](../../services/app-web/src/common-code/featureFlags/flags.ts). Take note that the `featureFlag` field is type `FeatureFlagSettings` so you will only be allowed to define flags that exists in [flags.ts](../../services/app-web/src/common-code/featureFlags/flags.ts).

```javascript
renderWithProviders(
  <ContractDetails
          draftSubmission={medicaidAmendmentPackage}
          updateDraft={jest.fn()}
          previousDocuments={[]}
  />,
  {
    apolloProvider: {
      mocks: [fetchCurrentUserMock({ statusCode: 200 })],
    },
    featureFlags: {
      'rate-edit-unlock': false,
      '438-attestation': true
    }
  }
)
```

### Server side unit testing
LaunchDarkly server side implementation is done by configuring our resolvers with `ldService` dependency. In our resolver we then can use the method `getFeatureFlag` from `ldService` to get the flag value from LaunchDarkly.

The unit testing implementation uses a test version of the `ldService` dependency called `testLDService` located in `app-api/src/testHelpers/launchDarklyHelpers.ts`.

`testLDService` takes in an object of feature flags and values as an argument which is used to return the flag value when `getFeatureFlag` is called in a resolver. If no feature flag object is passed in, then the function will return default values generated from `flags.ts` located in `app-web/src/common-code/featureFlags`.

```typescript
  function testLDService(
      mockFeatureFlags?: FeatureFlagSettings
  ): LDService {
      const featureFlags = defaultFeatureFlags

      //Update featureFlags with mock flag values.
      if (mockFeatureFlags) {
        for (const flag in mockFeatureFlags) {
          const featureFlag = flag
          featureFlags[featureFlag] = mockFeatureFlags[
                  featureFlag
                  ] as FeatureFlagSettings
        }
      }

      return {
        getFeatureFlag: async (user, flag) => featureFlags[flag],
      }
  }
```

We then pass `testLDService` with our defined flag values into `constructTestPostgresServer` when setting up the test server. Resolvers in the test will now use `testLDService` when calling `getFeatureFlag`, returning our defined feature flag values.

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

## Feature flag cypress testing
Currently, there is no out of the box Cypress integration with LaunchDarkly. Our implementation approach enables the testing of multiple flag values independent of what is set in LaunchDarkly by intercepting api calls and returning our own generated flag values. This allows us to dynamically tests UI in Cypress with different flag values without having to modify flag values in the LaunchDarkly dashboard.

### Limitations
There is one major limitation to this implementation: server and client side flag value syncing in Cypress runs. Since we are not reaching out to LaunchDarkly to either retrieve or set a flag value the server side does not know we have changed a flag's value. In this scenario the same flag would be in different states between client and server.

For example, we have some logic on the server side that checks a submission for completion on a new field. This check is behind a feature flag. So if the flag is off, then the check does not happen. Simultaneously on the client side this same flag controls the display of the UI that allows users to fill out this new field. The issue now lies in our Cypress test, we can test client side with this UI disabled for a specific user, but on server side it may be enabled by default for that user. The test fails because client side expects the server not to check for this field since this feature flag is off and UI is hidden.

There are a few solutions for this:
- We default all tests that use the flag to have the flag on. In the example above, all tests that will hit the server side check will have the UI enabled.
  - This is already being done for the time being.
  - Drawbacks:
    - I could see issues in the future when dealing with complex features behind a flag.
    - We cannot test the app with this feature flag off without manually turning off this flag in LaunchDarkly dashboard.
- We use specific users for these types of tests, where client and server flags must be synced. In the example above, we use `Toph` to test server side feature flags off and `Aang` for serverside feature flags on.
  - The existing code will have to handle account switching for tests as different states have their own data like programs.
  - This allows us to keep our implementation that prevents issues when multiple Cypress tests or manual testing happen at the same time with feature flags.
  - Drawbacks:
    - Cypress code may get complicated due to switching of accounts. Currently, the issue is only on selecting programs as programs are specific to a state, but there may be more features down the road that will complicate this.
- We switch this with a different implementation that actually calls out to LaunchDarkly to retrieve or set a flag value. [cypress-id-control](https://github.com/bahmutov/cypress-ld-control) looks like a promising library that does this.
  - This would solve the issue with syncing, since we would be calling out to LaunchDarkly to set our flag values.
  - Drawbacks:
    - We are making actual request to LaunchDarkly for every cypress run which may matter if our accounts limits the number requests we can make. Before the implementation with request stubbing we were consistently over the limit on requests.
    - We are not completely sure we can even make calls out to LaunchDarkly from the cypress code in CI.
    - Changing the flag values in LaunchDarkly may interrupt/break other Cypress CI or manual tests.
    - This would require the most work.

### Feature flag state management in Cypress
Our custom LaunchDarkly commands intercepts feature flag value requests and returns our own values we feed to the commands. Then the application code will be able to access those custom values, but we also needed a way access them with in Cypress throughout the tests. Specifically to determine when to test UI behind a feature flag.

The approach here was to implement state management that could be accessed though Cypress. Integrating `cy.readFile` and `cy.writeFile` into the LaunchDarkly helper commands.

The Cypress commands `cy.interceptFeatureFlags` and `cy.stubFeatureFlags` will generate a json file, using `Cy.writeFile`, in `services/cypress/fixtures/stores/` named `featureFlagStore.json` using data and Types from `flag.ts` located in `app-web/src/common-code/featureFlags`. The `cy.getFeatureFlagStore()`, using `cy.write`, is used to read the `featureFlagStore.json` file and return the object of feature flags with values.

### LaunchDarkly Cypress helper commands
- #### interceptFeatureFlags
  This command allows you to intercept LD calls and set flag values. It also generates a `featureFlagStore.json` file in `services/cypress/fixtures/stores` with default feature flag values along with any specific values passed in.
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
  This command intercepts all of LD api calls and returns our own response. This will remove the need for waiting on actual LaunchDarkly API calls to return. This command is being used on all specs in `beforeEach` to intercept requests on each test, set up default feature flag values in `featureFlagStore.json` and reset the LaunchDarkly feature flag store to default values before each test.
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
        cy.findByText('New rate certification').click()
        cy.findByText(
            'Certification of capitation rates specific to each rate cell'
        ).click()
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
Adding a new feature flag for testing is automatically done once you add the flag into list of flags in the `flags.ts` constants file located in `app-web/src/common-code/featureFlags`. Removing the flag from `flags.ts` can be done by removing it from the list.

**We should not be editing the `flag`s and `defaultValues` contained in `flags.ts` specifically for testing feature flags.** Because configuration of all the LaunchDarkly testing implementation heavily rely on these values, any change would cause many tests to fail. **Ideally we would only add, remove or edit them when application code relating to those flags changes.**

