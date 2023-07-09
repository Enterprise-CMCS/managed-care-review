# How to complete migrations

## Background
Migrations are a controlled way to change existing records in the database or else change the shape of tables/relationships. They are necessary when fields are added, removed, or when the meaning behind fields and their relationships change.

## General Guidance
- Prioritize testing in environments that have data similar to production. If you are testing on a review app, you should pre-populate data through using the deployed app a user or via Cypress runs to have a diversity of test data available.
- Run in all environments, in as close to a way as they run in CI.
- Write migrations that can be tested repeatedly.
- Avoid making migrations directly dependent on a specific feature in progress being available in production.

## Data Migrations
Currently data migrations change existing records in the database. They are run as standalone lambdas that developers must manually trigger by environment.

### Steps
1. Prepare for manual testing in lower environments.
    - Build a PR review app off `main` to start out. Try to populate with submissions similar to what is in production (For example, populate submissions via Cypress and there are specific submissions types you know you will need to test, make sure add them).
1. Write the migration with verbose logs.
    - The migration will be written as a [Node lambda](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html) and live in `app-api/src/handlers`.  Make sure you use ES6 async await.
    - Console statements are essential because there are line numbers in Cloudwatch when the migration fails or does not apply correctly. There is little additional context about why a run execution paused or failed.
    - Here is an example of verbose debug console statements wrapping a loop:
    ![debug consoles in data migration script](../../.images/verbose-logs-example.png)
1. Write unit tests.
    - Consider including a test for `migration can be run repeatedly without data loss or unexpected results". Using repeatable migrations (when possible) makes it easier on developers and easier to unwind work.
1. Manually test the migration in your review app.
    - Log into [AWS Lambda Console](https://console.aws.amazon.com/lambda/home) and find the lambda. This means choosing `app-api-` lambda with your branch name and migration name included.
    - Click the Test tab and the `Test` button. Use the generic hello world event.
        - All output will appear inline on the same page as the lambda run. All consoles appear there as well. You can also click into a link from there into Cloudwatch to be able to see entire output of logs around the lambda execution.
     - If you need to debug quickly, without waiting for redeploy in review app use the severless CLI script.
        -  `serverless deploy function --function name_of_migration --stage my_branch && echo "DEPLOYED" && serverless logs --function migrate_rate_documents  --stage my_branch --tail` can b e run in your `app-api` directory. This script runs serverless off your local API code (configured with your env variables) with the AWS resources associated with your branch.  `my_branch`is the name of your deployed Github branch and `name_of_migration` is the name of the migration file mind the file path.
        - If this is to be run in DEV (`main`) you will have to reshape your `envrc.local` to imitate configuration on that stage.
        - Command line serverless scripts should not be used on higher environments than dev - it's important to run the migration via AWS lambda directly since that configuration is more similar to how our promote CI works.
1. Define clear acceptance criteria, this will be re-used.
    - How do you know migration applied? What will be checked either in the app, via api request, or in the reports CSV?
    - Developers will have to verify that the change worked multiple times, basically each time the migration is run on a new environment since the data could be quite different.
    - If verification involves looking into reports and comparing fields, consider using a CSV tool like [CSVKit](https://csvkit.readthedocs.io/en/latest/index.html) if the comparisons seem involved.
1. After the PR merges and promotes,run in higher environments.
    - Start with DEV. Follow similar steps Step #4 but now using the `main` lambda for your migration.
    - Run the migration  DEV > VAL > PROD in order, verifying in the application (or via reporting output) after each run.


## Schema Migrations
We use Prisma to perform schema migrations. Right now the developer process for schema migrations is described a bit [here](../../README.md#updating-the-database). More detailed steps forthcoming.

## Proto migrations
The [proto migrations approach](../../services/app-proto/README.md#adding-a-new-migration) is no longer recommended - we are moving off protos.


