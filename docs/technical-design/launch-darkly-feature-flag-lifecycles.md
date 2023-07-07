# How to Manage Feature Flag Lifecycles

## Background

We use Launch Darkly to manage feature flags in the application. Without guidelines around when flags are added or removed from a codebase, feature flags can becomes a source of tech maintenance and confusion about when/if certain features are turned on. This document outlines how to add and remove feature flags.

## General Guidance

### Criteria for when a feature should be behind a flag

A feature typically can be added behind a flag if:

-   The entire feature isn't ready for production, but we want to ship parts of it for testing.

    -   Example: We're implementing CMS dashboard and after some user research we realize we need to change some backend resolvers. We can put this new code path behind a flag so the current UI continues to work while developers can access the new API responses while developing the new UI.

-   We want to show functionality to some users, but not others

    -   Example: We want to test a new document uploading workflow with a few states, but not for everyone in production. We’d put this behind a feature flag with a user segmentation set to the states we’re targeting for feedback.

-   We are unsure of performance characteristics of a feature and need to gather data

    -   Example: A new virus scanning lambda has been created, but we want to see if real world performance is better than what we have. We use a feature flag to scan some percentage of file uploads with the new lambda to gather metrics.

-   A/B testing of a feature

## Steps
### How flag to the codebase

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

### Remove flag from the codebase

Launch Darkly offers [code monitoring tools](https://docs.launchdarkly.com/home/code/code-references) to make removal of unused flags easier. Unfortunately, these are only offered to Enterprise plan subscribers, so this leaves flag monitoring [up to our team](https://docs.launchdarkly.com/guides/best-practices/technical-debt). We should schedule regular flag reviews as part of our sprint cadence to make sure we’re not keeping flags around that are no longer needed.

To remove an unused flag, first remove it from the `common-code/featureFlags` file. You should now be able to use your editor/IDE (or build errors) to find the place(s) that the variation call should be removed.

Once the flag has been removed from code, you’ll need to archive it in the Launch Darkly UI. This can be found under ‘Feature Flags > $flag-name > Settings` in the UI.

## Related documentation
- Setup steps for testing with Launch Darkly locally can be found in [testing approach documentation](./launch-darkly-feature-flag-lifecycles.md)