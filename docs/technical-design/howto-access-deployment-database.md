# How to access deployment database
## Background
Each of our deployment environments spin up separate postgres databases. Sometimes we need to be able to access the deployed databases in order to copy down data for local debugging or testing. We also need to be able to access the databases to apply SQL migrations to fix issues in the data. This doc will go over how to access a deployment database using the dev_tool.

## Required tools for accessing deployed databases
- VPN access via Zscalar and Cloud access via CloudTamer
  - To get access to VPN and Could access follow these [docs](https://docs.google.com/document/d/1OqHWKMm_FkZ_sVh9yG6EZ9aCo_IObpI_rBx9Os7s8m8/edit#heading=h.c0b1q58olc28).
- `awscli` package

## Retrieving AWS credentials for accessing deployment database
Before running the dev_tool we need to set AWS credentials.

- Start the VPN with Zscalar and logging in with your EUA credentials.
  - There will be two login screens, the first will ask just for an email. This is formatted like so `<YOUR EUA ID>@cms.hhs.gov`.
  - After clicking `Login` you will then see the CMS.gov login screen. Here you will use your EUA credentials.
  - To get access to VPN and Could access follow these docs.
- After the VPN is connected, visit https://cloudtamer.cms.gov and log in with your EUA credentials.
- You should see a list of projects with 3 `Managed Care <ENVIRONMENT>` environment selections. 
  - If you don't see them you have to create a access request Jira ticket in the [CMS Cloud Support Jira](https://jiraent.cms.gov/projects/CLDSPT/issues/CLDSPT-102640?filter=allopenissues) to start the process of getting access.
- Select an environment and get the AWS short term access keys for it.
  - Clicking the cloud dropdown next to each environment. 
  - Then `Cloud Access Roles > Managed Care Developer Admin > Short-term Access Keys` 
  - In the new window copy the variables for Option 1: Set AWS environment variables
- Paste the AWS environment variables into your .envrc.local file and run `direnv allow`.
- Log out of the VPN from Zscalar and close the program.

## Cloning deployment database to local machine
### Run dev_tool to clone database
- In the terminal make sure we are in the project root directory.
- Next we can run the dev tool command  `./dev jumpbox clone <env>`. Replace `<env>` with `dev`, `prod`, `val`
- Once finished, the dumped data should be formatted like this `dbdump-prod-20260306210445.sqlfc`. The file will be located at the project root directory.
    - `prod` is the environment the data is from.
    - The numbers present the date of the data copy.
### Apply deployment data to local deployed MC-Review app
- Start the local app by running `./dev local`
- In a new terminal, at the project root, copy the cloned data into the postgres docker container by running the command `docker cp dbdump-prod-20260306210445.sqlfc mcr-postgres:/`. Replace the file with the one you cloned.
- Next we restore the data to your local deployment database by running the command `docker exec -it mcr-postgres pg_restore -h localhost -p 5432 -U postgres -d postgres --clean --if-exists --no-owner --no-privileges dbdump-prod-20260306210445.sqlfc`.
- When complete you should now see production data in your local deployed app.

## Direct database access
We can also the dev_tool command `./dev jumpbox connect-pg <env>` to get direct access to the deployment database. With direct access you can run SQL queries on the database. Exercise with caution as this will update the deployments database immediately and could cause production data corruption.

- Run the dev_tool command `./dev jumpbox connect-pg <env>`
  - This could take a few minutes. If there are any issues, exit out of the process and delete all the mc-review related docker containers. Then try running the command again.
- Once connected you will be able to run the SQL commands in the same terminal

### Accessing review deployment logical databases
Our pull requests spin up a review deployment for each PR. These deployments also use the postgres database in `dev` but create a logical database for the review deployment to use. This mean to access each review deployments database you can to do an additional connection command to it.

- If not already connected to the `dev` deployment database, run he command `./dev jumpbox connect-pg dev`.
- Once connected, list out all the logical databases by running the SQL code `SELECT datname FROM pg_database WHERE datistemplate = false;`
- Find the review app name you want to connect to and run the command `\c <Logical DB name>`.
- If successful, you can now run SQL commands and it will be isolated to that logical database.

