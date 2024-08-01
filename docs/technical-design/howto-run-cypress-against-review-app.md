# Running Cypress against review app

When trying to debug flakes or failures in CI Cypress, we run the same test locally, but we often run into reproduction issues. To better reproduce the issue in Cypress on our local machine, we can run a local Cypress instance against the deployed review app. The following instructions will configure your local environment to do this.

### Add AWS short term access code to environment variables
  - Obtain temporary AWS credentials for `Managed Care Dev` and place them in your `.envrc.local`. You’ll need CMS VPN access to get these credentials.
    - Example:

      ```
      export AWS_ACCESS_KEY_ID=$awsAccessKeyID
      export AWS_SECRET_ACCESS_KEY=$awsSecretAccessKey
      export AWS_SESSION_TOKEN=$awsSessionToken
      ```

    - Run `direnv allow` in the project root to update environments variables.

### Starting Cypress
If your current branch has been deployed as a review app, you can run this command. It retrieves the environment values for the current branch stage name to configure Cypress.
```
./dev test browser --in-review-app
```

If you want to specify a deployed branch to run Cypress against, you can use the `--stage-name` option followed by the branch stage name you want to configure Cypress to run against
```
./dev test browser --in-review-app --stage-name other-branch-here
```

 To get the stage name of a branch
  - In the pull request of the branch in GitHub find `Finished Prep` job in the CI checks and click details.
  - In `Finished Prep` find `get application endpoint` and expand `Run cd services` to find the `STAGE_NAME` value.
