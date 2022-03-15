# Client Side Feature Flags using Custom JavaScript


As new features are built out in the application, we need a way to prevent users from
seeing (and attempting to use) partially implemented functionality. At the same time,
we want to be able to selectively test features in specific environments.

## Considered Alternatives

* Manage ourselves by using environment variables to toggle features on and off
* Use AWS feature flag management tools
* Use [Launch Darkly](https://launchdarkly.com/implementation/)


## Decision Outcome


## Pros and Cons of the Alternatives

### Manage ourselves by using environment variables to toggle features on and off

* `+` We already use environment variables to configure many parts of the application
* `-` Production environment variables are not available when the docker images are built on CircleCI
* `-` Many libraries exist to handle this, however, none that would work with both
  Go and JavaScript code without additional work on our part.
### Launch Darkly

* `+` Provides a user-friendly web interface for controlling flags
* `+` Changes to flags do not require a code change or deployment
* `+` Provides server-side and client-side functionality
* `+` Allows for multivariate flags that contain values beyond simple boolean values
* `-` Adds a dependency on a new external service
* `-` Involves using the official Launch Darkly APIs
