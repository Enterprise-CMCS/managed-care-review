# 003 — Deploy Automatically to Prod

The deployment process is a crucial piece of our overall process of delivering a stable, reliable, defect free application to the world. The modern best practice here is called "Continuous Delivery" which means that as new code is written, it should be put into production quickly, reducing the feedback loop between making changes and seeing those changes proven in the wild. (This stands in contrast to software delivery of old when the state of the art required shipping a CD to a customer with little opportunity for software updates) Within Continuous Delivery, there are still decisions to be made about how code winds its way from a developer's computer into the public's hands, so let's talk them over.

## Considered Options

### Deploy to dev on every merged PR

This is going to be a part of all the other options we discuss so I'm breaking it out here separately so as not to repeat myself. Once code has been written, a PR created and reviewed, and then merged to the main branch, we will run our unit tests and then deploy that code to the dev environment. The dev environment is not expected to be perennially stable, it will be a place where changes can be experimented with.

### Deploy automatically from dev → val → prod

After a successful deploy to dev, we deploy the same code to val. Val is kept in as close a state to prod as possible. Differentiators from dev can include periodically copying anonymized data from prod to the val database and making sure that all env vars are set the same in val as in prod. Once that deploy is complete, we will run automated validation tests against the deployed code. This will likely include some kind of UI test of a subset of user flows. Logging in and making a submission say. Once those tests pass, we will then deploy to prod. After a successful prod deploy, smoke tests can verify that it's up, raising the alarm if something disastrous happens.

### Manually gate deploys to val and prod

After a successful deploy to dev, a manual step is added to the GitHub actions pipeline that initiates deploying to staging. https://deliverybot.dev is one tool for doing this but there are likely ways to do this inside a GitHub actions pipeline. Crucially the "promote" action should be limited to promoting a main branch commit that has passed tests and been deployed to dev. Once that is deployed to val, it is gated again in the same way. Any validation tests required can be performed on val and when ready, that same commit can be promoted and deployed to prod.

### Automatically deploy to val, manually gate deploys to prod

As above, insert a manual gate for deploys between val and prod. This lets you do manual acceptance testing on val before anything goes to prod, but continuously pushes valid code into staging.

### Match val and prod to tags. Deploy to val on new version tag, manually gate deploy to prod

This is the most flexible option. We use tags for release versions. We can then cut a version from any branch if we need to hot fix something. The tag when pushed triggers a deploy to val, and then from there we can do validation testing and allow pushing that same tag to prod when it is ready.

## Chosen Decision: Deploy Automatically

The primary benefit to automated deploys is to reduce the overhead of deploys, both because smaller deploys are less risky, and because manual deploys require scheduling and attention that with a small team are in short supply. This is particularly significant at this stage of the project because we only plan to have a couple of engineers for the next several months. Setting up an automated gate in Val early lets us iterate on that and build out automated tests to run on every deploy, rather than relying on a manual script for the same. Having an automated process encourages a culture of merging smaller PRs all the way to prod which reduces the risk of each deploy in two ways. Individual changes are small so there is less to break in each push, and if something does break, there are fewer changes to consider in diagnosing the problem which speeds the resolution.

### Pro/Cons

#### Automatic Deploys

-   `+` Deployments are truly continuous. We don't bundle up changes into releases, we just release work when it is ready and monitor for issues
-   `+` Reduces release overhead. It's an automated process, instead of something someone needs to be responsible for once a day or once a week
-   `+` Smaller changes are easier to debug if something goes wrong
-   `+` Dovetails nicely with using feature flags. Work can be automatically merged and deployed even if it is disabled via flag
-   `+` encourages building an automated test suite we can rely on
-   `-` If there is an issue with a deploy, it's probably best to stop merging PRs until it is fixed, there's not an easy way to build a hot-fix while development continues
-   `-` deploys aren't bundled up, so prod is less static than otherwise. Changes may come in at any time

#### Manual Gates

-   `+` Deploys can be planned around, there is less likely for an issue to appear at random
-   `+` Since deploys are kicked off by someone, they can be monitored closely
-   `+` Val can be tested and validated manually by someone who knows what features have been added
-   `-` Deploys become a regular responsibility that needs to be shared and takes time away from other work
-   `-` Bundled changes means that each deploy is higher risk, more is likely to change
-   `-` Complicates the delivery process. Now different branches need to be kept in sync, or somehow otherwise manage different versions of things

#### Use Tags for releases

-   `+` Obvious what gets released where
-   `+` Can hot-fix prod from a previously deployed version of main
-   `-` Need to put in extra logic to defend against pushing branches that have not been merged from a PR

### How to change this decision

If later on the size of the team and our user base demands more packaged releases, we can add in a manual button for the deploy to prod into this system.
