# Use Launch Darkly for feature flags

Our application, much like others built off the [CMS MacPro QuickStart](https://github.com/CMSgov/macpro-quickstart-serverless), uses a continuous deployment approach. This means every merged code change that passes through all stages of the production pipeline (including extensive automated tests) is released to users. This approach is an excellent way to accelerate both development and the feedback loop with users. However, as new large features are built out in the application, we would like a way to prevent users from attempting to use partially implemented functionality as it rolls out over multiple sprint cycles.

In other words: we want to be able to **selectively show features to users, while still getting the benefits of continuous deployment**. We are also interested in the ability to show different versions of the app to different types of users, e.g. be able to test a new feature only with users from the state of California or only with users that are part of a predetermined test group. A common way to approach this technical problem is through the use of [feature flags](https://martinfowler.com/articles/feature-toggles.html). There are several approaches to consider.

## Considered Alternatives

* Do nothing
* Manage ourselves by using environment variables to toggle features on and off
* Use AWS feature flag management tools
* Use Launch Darkly

## Decision Outcome

Use LaunchDarkly because of the robust feature flag management tools that will allow our multidisciplinary team to effectively test, validate, and selectively expose new, complex features.

## Pros and Cons of the Alternatives

### Do nothing

* `+` No change, no extra dependencies. Continue to release code to users as it is ready and users will see changes reflected in their environments.
* `+` No communication needed around what code is available on what environment. If it's merged,  it is immediately usable in the higher environments.
* `+` No team overhead required to manage flags.
* `-` Incremental feature changes that are part of larger incomplete epics will visible to users in production, which can cause confusion or result in a broken user experience (such as with CMS unlock and submission editing epic).
* `-` A high level of coordination is needed across the team to make sure higher environments are is a good state before testing new users with features.
* `-` No ability to selectively test groups of changes together on production without also making them immediately visible to users.

### Manage ourselves by using environment variables to toggle features on and off

* `+` We can hide groups of changes behind an environment flag and make sure it is tested together before making it visible to users.
* `+` We already use environment variables to configure many parts of the application.
* `+` JS libraries exist to make this easier such as [Unleash](https://github.com/Unleash)
* `-` Does not de-couple the act of delivering code from the act of enabling a new feature. A release is still required. 
* `-` No birds-eye visibility for product and design about where/when/why features are flagged. Also developers would be required to turn flags on and off.
* `-` Any custom handling of flags such as by user or by state, or multi-variant flags, has to be built by developers. The potential for bugs increases with this complexity.
* `-` Client-side and server-side feature flags may need separate handling and approaches

### Use AWS feature flag management tools

These tools include [AWS AppConfig](https://docs.aws.amazon.com/appconfig/latest/userguide/what-is-appconfig.html), which is part of AWS Systems Manager, and [CloudWatch Evidently](https://aws.amazon.com/blogs/aws/cloudwatch-evidently/).

* `+` Built in to AWS, integrates with Lambda, and already approved by CMS.
* `+` Changes to flags do not require a code change or deployment. De-couples the act of delivering code from the act of enabling a new feature.
* `+` Users who have AWS access have birds-eye visibility into where/when/why features are flagged. This is limited to developers.
* `+` Includes ability for non boolean flags and multivariate flags.
* `-` No visibility or control over feature flagging for product and design since they do not have AWS access.
* `-` Any custom handling of flags on by user or by state basis (rules) have to be custom built or will require additional third party libraries.

### Launch Darkly

[LaunchDarkly](https://launchdarkly.com/implementation/) is third party feature flag management tool that includes a SASS platform and SDKs that would need to be integrated into the codebase.

* `+` Provides a user-friendly web interface for controlling flags. This dashboard includes feature management abilities such as scheduling, audits, etc which can be used by engineering, product and design.
* `+` Changes to flags do not require a code change or deployment. De-couples the act of delivering code from the act of enabling a new feature. Documentation with options for [use in serverless environments](https://docs.launchdarkly.com/guides/best-practices/serverless) exists.
* `+` All team members have visibility into where/when/why features are flagged and approved. Non-engineers could access and toggle flags in certain environments (such as testing) as well, given permissions.
* `+` Allows for [multivariate flags](https://docs.launchdarkly.com/home/flags/variations#understanding-multivariate-flags) that contain values beyond simple boolean values.
* `+` Some teams at CMS have used the tool successfully before.
* `+` Any custom handling of flags on by user or by state basis can be configured within the LD by applying rules. Extensive documentation about the best use of rules exists.
* `-` Adds a dependency on a new external service and requires us to implement integration
* `-` Involves using the official Launch Darkly APIs
* `-` Tracking and maintaining feature flags (i.e. reviewing active flags, retiring flags, deprecating retired flags from code) requires additional overhead 
