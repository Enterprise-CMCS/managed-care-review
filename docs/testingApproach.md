# MC Review Testing Approach

## Backend API Tests

-   Write most tests at the API request layer.
    -   A test makes API requests and makes assertions about the responses
    -   We don’t mock the database, it’s behavior is pretty crucial to the functioning of the app
    -   We will mock other remote services
-   Write unit tests for complex functions
    -   E.g. our submission validation function, we can table test a bunch of draft submissions and assert that they are valid or not valid correctly

## Frontend Component Tests

These tests are written using Jest and Testing Library.

We test all our individual components that are big enough to be in Storybook

-   Assert that things render the expected way given different props

We test every page of our form as well:

-   Test that given initial values, the correct values are displayed in fields
-   Test validations run, given some values, does the right error text render
-   Test conditional questions display correctly
    -   E.g. if you select “other” is the “other” field displayed?
-   Test accessibility actions work
    -   E.g. AX focus changes on error

## Cypress Integration Tests

These tests run against a fully deployed version of the app. Tests that require moving around between different pages of the app, which would require extensive fragile mocking as component tests, should be done here

-   Test that filling out the form saves and reloads data correctly
-   Test navigating between different pages saves data correctly
-   Test interactions between pages
    -   E.g. if you make a submission Contract Only, the Rates page should no longer appear in the flow

Happy Path E2E test:

-   Run through the whole app end to end to make sure that the whole flow works

A Smoke Test:

-   One test that hits all the various components of the app to make sure they are configured correctly
-   We will use this in our deploy process as a gate between environments
