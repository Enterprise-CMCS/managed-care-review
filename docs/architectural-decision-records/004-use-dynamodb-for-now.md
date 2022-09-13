# 004 — Use DynamoDB as our Datastore

We need to decide on what database to use to store data for the pilot. Our current infra plan has some weaknesses we intend to shore up when we have dedicated infra engineers on the project, so we are going to consider a few different options for how we might store data. For the pilot, we need to store some static user/state info as well as user submissions.

## Considered Options

### Stand Up Postgres

-   RDS deployed via serverless
-   Migrations deployed via a lambda
-   Backups would need to be built out

### Use Dynamodb

-   Need to build a layer of abstraction that would allow for switching to RDS in the future
-   Submission metadata may make sense in a dynamodb-like format anyway
-   It’s not relational, it’s going to be referred to a lot but probably not cross-referenced
-   Would absolutely need to be switched over to Postgres when we begin work on the back-office workflow

### Store everything in files in S3

-   We store the metadata for a submission in a json file, or an Avro file next to the files themselves
-   Web client would read files in s3 and sort out what to display

### Don’t do any storage of metadata, just submit and forget

-   This promises the least rework, but also significantly impacts the pilot

## Chosen Decision: Use DynamoDB For Now

In order to both make quick progress on the pilot and not to overly complicate our current infrastructure needs before we have dedicated infra support, we will use dynamodb for the first stage of the pilot. We will develop the db interface in the backend such that it's as easy as possible to swap out things to Postgres when the time comes, but we will use the document db for now.

### Pro/Cons

#### Postgres

-   `+` This is the database we want to build the whole product on.
-   `+` We will need this by the time we start working on the approval workflow with relational data
-   `+` Starting with it means we’ll finish with it
-   `-` Requires significant infra work to be production ready (Help would be required for us to try and deploy something quickly)
-   `-` Is heavier infrastructure, stressing our shaky foundation more
-   `-` Unclear how that work should be done in the current environment
-   `-` Waiting may bring clarity

#### DynamoDB

-   `+` Already configured, with free backups
-   `+` We should be able to design the api to be swappable to postgres later on
-   `+` Lots of submission data isn't relational
-   `-` Gives us a lot of what Postgres gives us, enough that we might not prioritize the switch when we need it
-   `-` Doesn't give us some important things we are going to want from postgres in the long haul
-   `-` Requires careful engineering to allow the swap to happen down the road

#### S3

Pros:

-   `+` It’s janky enough that we’ll be more likely to jump to postgres when we can
    Cons:
-   `-` It’s going to be harder to reason about failures since the “database” is just files.
-   `-` It puts a bunch of logic in the client and de-emphasizes the API
