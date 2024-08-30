# Cypress

This service deploys our Cypress app for e2e testing locally and CI. An important note is that the actual Cypress package is installed in the root `node_modules` this was the only way we could get Cypress commands to work in CI.

### Deploying locally

-   Run local Cypress app and test against the local app deployment.
    -   `./dev test browser`
-   We can also run the local Cypress app against a review app deployment.
    -   ```
        ./dev test browser --in-review-app
        ```
    - See [howto-run-cypress-against-review-app](../../docs/technical-design/howto-run-cypress-against-review-app.md) on instructions for setting up your local environment to run this command.

### Deploying in CI

CI deployment is congifured in `.github/workflows/deploy.yml`.

-   The `cypress` job is where cypress is configured and ran in CI. Here some notable steps in this job

    -   Because we cannot run the generate commands in order to get the `gen` folder and files we instead download it. These `gen` folders where uploaded from the earlier `web-unit-tests` job.

        ```yaml
        - uses: actions/download-artifact@v3
          with:
              name: app-web-gen
              path: ./services/app-web/src/gen

        - uses: actions/download-artifact@v3
          with:
              name: cypress-gen
              path: ./services/cypress/gen
        ```

    -   In the `Cypress -- Chrome` step we have configured it to point to our `cypress.config.ts`. This is because cypress is actually ran from the root directory and not in the `services/cypress` directory. We had issues with running Cypress in `services/cypress` we think this is because that directory has no `yarn.lock` which seems like what Cypress needs to check versions. So Cypress is now ran from the root folder, while all the config and test files are pointed to our `services/cypress` directory
        ```yaml
        - name: Cypress -- Chrome
          id: cypress
          uses: cypress-io/github-action@v5
          with:
              config: baseUrl=${{ needs.finishing-prep.outputs.application-endpoint }}
              record: true
              parallel: true
              browser: chrome
              group: 'Chrome'
              ci-build-id: ${{ needs.finishing-prep.outputs.cypress-uuid }}
              # Point to the cypress config file from root
              config-file: services/cypress/cypress.config.ts
          env:
              VITE_APP_AUTH_MODE: AWS_COGNITO
              CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
              GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
              TEST_USERS_PASS: ${{ secrets.TEST_USERS_PASS }}
              VITE_APP_API_URL: ${{ needs.finishing-prep.outputs.api-endpoint }}
              COGNITO_USER_POOL_ID: ${{ needs.finishing-prep.outputs.cognito-user-pool-id }}
              COGNITO_REGION: ${{ needs.finishing-prep.outputs.cognito-region }}
              COGNITO_IDENTITY_POOL_ID: ${{ needs.finishing-prep.outputs.cognito-identity-pool-id }}
              COGNITO_USER_POOL_WEB_CLIENT_ID: ${{ needs.finishing-prep.outputs.cognito-user-pool-web-client-id }}
              # Overwrites folder directories in cypress config because in CI we run from root
              CYPRESS_SUPPORT_FILE: services/cypress/support/index.ts
              CYPRESS_FIXTURES_FOLDER: services/cypress/fixtures
              CYPRESS_SPEC_PATTERN: services/cypress/integration/**/*.spec.ts
              CYPRESS_SCREEN_SHOTS_FOLDER: services/cypress/screenshots
              CYPRESS_VIDEOS_FOLDER: services/cypress/videos
        ```

### Launch Darkly Integration

LaunchDarkly integration docs can be found in [launch-darkly-testing-approach.md](../../docs/technical-design/launch-darkly-testing-approach.md#feature-flag-cypress-testing)

### Accessibility Testing 

We are using the `cypress-axe` plugin to run our a11y tests. `cypress-axe` uses the `axe-core` testing engine.

Our implementation is almost exactly like the [documentation](https://github.com/component-driven/cypress-axe) for `cypress-axe`. The only difference is our custom Cypress command `cy.checkA11yWithWcag22aa()` which is configured to only use `WCAG 2.2 AA` standard for tests. This follows our to follow our ADR [frontend-a11y-toolset](/docs/architectural-decision-records/005-frontend-a11y-toolset.md).

To run axe inject the `axe-core` runtime using `cy.injectAxe()` after `cy.visit()`. Then you can call the custom command `cy.checkA11yWithWcag22aa()` to check a11y against the page. Each time you use `cy.visit()` you will need to inject the runtime again.

The `checkA11yWithWcag22aa` command configures `cy.checkA11y()` with the WCAG 2.2 AA standard we use for the MC-Review app. In the `cy.checkA11y()` there are more options we can configure the check with. The options are specified in the [axe-core documentation](https://www.deque.com/axe/core-documentation/api-documentation).

In the example below, you will notice that there are more than the WCAG 2.2 AA standard being used in the test. This is because the rules for each standard are not cumulative. So in order to test all rules, all the standards must be included. If we only include `'wcag22aa'` then only the specific rules added in for that standard will be tested.
```typescript
Cypress.Commands.add(
    'checkA11yWithWcag22aa',
    () => {
        cy.checkA11y('', {
            runOnly: {
                type: 'tag',
                values: ['wcag2a','wcag2aa', 'wcag21a', 'wcag21aa','wcag22aa']
            },
        }, terminalLog)
    }
)
```

In the example below, `cy.logInAsStateUser()` calls `cy.visit()` so we can inject the runtime after and then run the a11y checks.
Using the app to navigate allows us to check a11y without injecting the runtime again because it is still available

```typescript
    it('has not a11y errors with submission form and and form erros', () => {
        // 438-attestation still needs to go through design, there is an a11y violation for links and spacing
        cy.interceptFeatureFlags({'438-attestation': false})
        cy.logInAsStateUser()
    
        // Inject the axe run-time
        cy.injectAxe()
    
        // Start a base contract only submissions
        cy.findByTestId('state-dashboard-page').should('exist')
        cy.findByRole('link', { name: 'Start new submission' }).click()
    
        // Check accessibility on Submission type page
        cy.findByRole('heading', { level: 1, name: /New submission/ })
        cy.findByRole('button', {
            name: 'Continue',
        }).should('not.have.attr', 'aria-disabled')
        cy.findByRole('button', {
            name: 'Continue',
        }).safeClick()
        cy.checkA11yWithWcag22aa()
    
        cy.fillOutContractActionAndRateCertification()
        cy.deprecatedNavigateV1Form('CONTINUE_FROM_START_NEW')
    
        cy.findByRole('heading', { level: 2, name: /Contract details/ })
        cy.findByRole('button', {
            name: 'Continue',
        }).should('not.have.attr', 'aria-disabled')
        cy.findByRole('button', {
            name: 'Continue',
        }).safeClick()
        cy.checkA11yWithWcag22aa()
        ...
```

In the next portion of the same test, we are then navigating by direct links using `cy.visit()` wrapped by our custom command `navigateFormByDirectLink()`. Now that we called `cy.visit()` the last injection of the runtime is unavailable and will need to be re-injected.

```typescript
    ...
    // Check accessibility on rate details page
    cy.navigateFormByDirectLink(`${submissionURL}edit/rate-details`)
    cy.findByRole('radiogroup', {
        name: /Was this rate certification included with another submission?/,
    })
        .should('exist')
        .within(() => {
            cy.findByText('No, this rate certification was not included with any other submissions').click()
        })
    cy.injectAxe()
    cy.findByRole('button', {
        name: 'Continue',
    }).should('not.have.attr', 'aria-disabled')
    cy.findByRole('button', {
        name: 'Continue',
    }).safeClick()
    cy.checkA11yWithWcag22aa()

    //Check accessibility on contacts page
    cy.navigateFormByDirectLink(`${submissionURL}edit/contacts`)
    cy.findByRole('heading', { level: 2, name: /Contacts/ })
    cy.injectAxe()
    cy.findByRole('button', {
        name: 'Continue',
    }).should('not.have.attr', 'aria-disabled')
    cy.findByRole('button', {
        name: 'Continue',
    }).safeClick()
    cy.checkA11yWithWcag22aa()
    ...
```

### Direct API Requests

The reason for making direct API request through Cypress was to speed up testing by quickly making a new submission to test against. For example, the `questionResponse.spec` test only tests Q&A features but needed a submission in order to get to Q&A, so a new submission was needed and without API request Cypress had to manually go through the state submission form. Now we make a new submission using direct API request which is much faster.

#### Setup

We mimicked the same setup in the application in Cypress to make graphql request.

-   `GraphQL`
    -   Like `app-web` and `app-api`, `cypress` also has a `gen` folder where our `GraphQL` and `ProtoBuf` files will be generated.
    -   Specifically the `schema.graphql` file from the `gen` folder is used in `cypress.config.ts` to configure the `Apollo` client.
        -   In `cypress.config` under `setupNodeEvents` there is a task, `readGraphQLSchema`, that can be called in Cypress to load our `GraphQL` schema and convert it to `gql`.
            ```ts
            on('task', {
                readGraphQLSchema() {
                    const gqlSchema = fs.readFileSync(
                        path.resolve(__dirname, './gen/schema.graphql'),
                        'utf-8'
                    )
                    return gql(`${gqlSchema}`)
                },
            })
            ```
        -   The `readGraphQLSchema` task is used in our API Cypress commands to get the `GraphQL` schema before passing it to the `Apollo` client configuration. The `Apollo` client configuration is done in `apolloClientWrapper` function.
            ```ts
            Cypress.Commands.add(
                'apiCreateAndSubmitContractOnlySubmission',
                (): Cypress.Chainable<HealthPlanPackage> => {
                    return cy
                        .task<string>('readGraphQLSchema')
                        .then((schema) => createAndSubmitPackage(schema))
                }
            )
            ```
-   `Amplify` for CI

    -   In `apollo-test-utils.ts` we are configuring `Amplify` in order to pass authentication through the `Apollo` client.
        ```ts
        Amplify.configure({
            Auth: {
                mandatorySignIn: true,
                region: Cypress.env('COGNITO_REGION'),
                userPoolId: Cypress.env('COGNITO_USER_POOL_ID'),
                identityPoolId: Cypress.env('COGNITO_IDENTITY_POOL_ID'),
                userPoolWebClientId: Cypress.env(
                    'COGNITO_USER_POOL_WEB_CLIENT_ID'
                ),
            },
            API: {
                endpoints: [
                    {
                        name: 'api',
                        endpoint: Cypress.env('API_URL'),
                    },
                ],
            },
        })
        ```
        -   All the env variables are passed into Cypress in CI. You can take a look in `.github/workflows/deploy.yml` at the `Cypress -- Chrome` step to see the environment variables being set.

-   `Apollo` client
    -   In `apollo-test-utils.ts` we have the `apolloClientWrapper` function where a new `Apollo` client is created.
    -   This wrapper function handles `Amplify` authentication as well as configuring and passing the `Apollo` client to your api requests.
    -   The wrapper takes 3 arguments
        -   `schema`: The graphql schema.
        -   `authUser`: The user making the API requests
        -   `callback`: The api commands passed in as a callback function
            ```ts
            Cypress.Commands.add(
                'apiCreateAndSubmitContractOnlySubmission',
                (stateUser): Cypress.Chainable<HealthPlanPackage> => {
                    cy.task<string>('readGraphQLSchema').then((schema) =>
                        apolloClientWrapper(schema, stateUser, callback)
                    )
                }
            )
            ```
    -   This wrapper functions return type should be whatever the `callback` functions return type is.
    -   **If running Cypress locally, this wrapper function will skip Amplify sign in and out because for local deployment we do not use cognito auth. Instead, we will pass in headers for local API requests in the `Apollo` client configuration.**
        ```ts
        const httpLinkConfig = {
            uri: '/graphql',
            headers:
                authMode === 'LOCAL'
                    ? {
                          'cognito-authentication-provider':
                              JSON.stringify(user),
                      }
                    : undefined,
            fetch: fakeAmplifyFetch,
            fetchOptions: {
                mode: 'no-cors',
            },
        }
        ```
-   Using the `Apollo` client to make
    -   A request can be created by using the `apolloClient` to call the `query` or `mutate` method and pass in the `gql` and `variables`
    -   We can import our `gql` mutations and queries from the generated file `gen/gqlClient.ts`.
        ```ts
        const newSubmission = await apolloClient.mutate({
            mutation: CreateHealthPlanPackageDocument,
            variables: {
                input: newSubmissionInput,
            },
        })
        ```

#### Adding Cypress API commands

We can use the `apiCreateAndSubmitContractOnlySubmission` cypress command as an example on how to make these API commands.

-   To see a full example on how this command works, look at `integration/stateWorkflow/questionResponse/questionResponse.spec.ts` test.

1. In `cypress/support/apiCommands.ts` we can add a new API command that has a return type of `Cypress.Chainable<HealthPlanPackage>`. This is important because the type allows us to use the `.then()` when using the command to wait for API requests to finish before continuing with the test.

    ```ts
    Cypress.Commands.add(
        'apiCreateAndSubmitContractOnlySubmission',
        (stateUser): Cypress.Chainable<HealthPlanPackage> => {}
    )
    ```

2. We then add this command to `cypress/support/index.ts` with the same return type
    ```ts
    declare global {
        namespace Cypress {
            interface Chainable<Subject = any> {
                // ...other commands
                apiCreateAndSubmitContractOnlySubmission(
                    stateUser: StateUserType
                ): Cypress.Chainable<HealthPlanPackage>
            }
        }
    }
    ```
3. Now we can go back to the command we made in `cypress/support/apiCommands.ts` and get the `GraphQL` schema for configuring our `Apollo` client by running the `readGraphQLSchema` task in `cypress.config.ts`
    ```ts
    Cypress.Commands.add(
        'apiCreateAndSubmitContractOnlySubmission',
        (stateUser): Cypress.Chainable<HealthPlanPackage> => {
            return cy
                .task<string>('readGraphQLSchema')
                .then(
                    (schema) =>
                        `our function for the api requests will go here in the next step`
                )
        }
    )
    ```
4. Once we have the `schema` we first call `apolloClientWrapper` that handles the `Amplify` authentication, configuring the `Apollo` client, and passing client to the callback function.
    - This function takes three arguments:
        - `schema`: The schema we just retrieved using `cy.task('readGraphQLSchema')`
        - `authUser`: The user that will be used for authentication and API requests.
        - `callback`: The callback function that contains all the API requests. We will be making this function in the next step.
            ```ts
            Cypress.Commands.add(
                'apiCreateAndSubmitContractOnlySubmission',
                (stateUser): Cypress.Chainable<HealthPlanPackage> => {
                    cy.task<string>('readGraphQLSchema').then((schema) =>
                        apolloClientWrapper(schema, stateUser, callback)
                    )
                }
            )
            ```
5. To make our callback function that does all the API requests we start by creating a function accepts `apollClient` as an argument with the type `ApolloClient<NormalizedCacheObject>`. In this function we can now make requests using the apollo client and our `gql` mutations and queries from `gen/gqlClient.ts`

    ```ts
    const createAndSubmitPackage = async (
        apolloClient: ApolloClient<NormalizedCacheObject>
    ): Promise<HealthPlanPackage> => {
        const newSubmission = await apolloClient.mutate({
            mutation: CreateHealthPlanPackageDocument,
            variables: {
                input: newSubmissionInput,
            },
        })

        const pkg = newSubmission.data.createHealthPlanPackage.pkg
        const revision = pkg.revisions[0].node

        const formData = base64ToDomain(revision.formDataProto)
        if (formData instanceof Error) {
            throw new Error(formData.message)
        }

        const fullFormData = {
            ...formData,
            ...contractOnlyData,
        }

        const formDataProto = domainToBase64(fullFormData)

        await apolloClient.mutate({
            mutation: UpdateHealthPlanFormDataDocument,
            variables: {
                input: {
                    healthPlanFormData: formDataProto,
                    pkgID: pkg.id,
                },
            },
        })

        const submission = await apolloClient.mutate({
            mutation: SubmitHealthPlanPackageDocument,
            variables: {
                input: {
                    pkgID: pkg.id,
                    submittedReason: 'Submit package for Q&A Tests',
                },
            },
        })

        return submission.data.submitHealthPlanPackage.pkg
    }
    ```

6. Now we can place this function as the `callback` parameter of `apolloClientWrapper` in our command, and now it is ready to be used in tests.
    ```ts
    Cypress.Commands.add(
        'apiCreateAndSubmitContractOnlySubmission',
        (stateUser): Cypress.Chainable<HealthPlanPackage> =>
            cy
                .task<string>('readGraphQLSchema')
                .then((schema) =>
                    apolloClientWrapper(
                        schema,
                        stateUser,
                        createAndSubmitPackage
                    )
                )
    )
    ```
7. In a test spec we can use `cy.apiCreateAndSubmitContractOnlySubmission` to perform the API requests.

    ```ts
    import { stateUser, cmsUser } from '../../../utils/apollo-test-utils'

    describe('API Requests', () => {
        it('Makes API requests then does things', () => {
            cy.apiCreateAndSubmitContractOnlySubmission(stateUser).then(
                (pkg) => {
                    // Rest of the test runs after API requests are finished
                }
            )
        })
    })
    ```
