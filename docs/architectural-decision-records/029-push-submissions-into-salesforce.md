# Push Submission Data Into Salesforce

In order for CMS users to be able to review submissions in Salesforce, all submission need to be in the Salesforce database. We will first get data into Salesforce by calling Salesforce APIS from app-api on every submission. Other data sync strategies may follow. 

### Decision Drivers

- Data needs to get into Salesforce automatically, not by manually copying data over from the web portal. 
- It needs to be in the Salesforce review system within an hour or so
- We would like to be able to include a link to the Salesforce record in the email we send on submission
- We can rely on Salesforce's builtin change tracking so we don't need to send over revisions, just per-contract and per-rate data
- Source of truth for all submission data will be the web portal, no edits will be allowed in Salesforce, only review information will be entered there. 
- We will need to import Contracts, Rates, Questions, and Responses.
- Can be implemented by the end of the year, we are on a deadline with this project


## Options

### Chosen: Write a script to pull data from app-api into Salesforce

Run a script on a scheduled job that imports data into Salesforce from app-api. Probably add an "updatedAfter" flag to most index APIs to thin responses. We will run this script on the regular with no automated error handling. When we want to get into error handling we can start to investigate pub-sub

-   `+` Can be used to sync historical data over
-   `+` If it errors, we still will get data into the system on the next run, or after we fix the bug
-   `+` Would call existing app-api API, same way we've asked ARMS to
-   `-` Not instantaneous, probably can't send Salesforce link in submission email
-   `-` Hand-rolling sync code, pub/sub would provide a lot of stuff for free

### Push data into Salesforce from app-api on submission

Salesforce has a few different API options for sending data into its database from outside. We can make a REST call from app-api as part of all of our create* handlers. This will send data into Salesforce immediately at submission time, there will be no gap. On resubmission we will send over the new data. -- Historical data can be loaded one-time. 

-   `+` Data is sync'd to Salesforce immediately
-   `+` Get to write a single API call, no diffing with existing data required
-   `+` Get data back immediately, can send links to Salesforce in submission email
-   `-` No sync, if any calls fail we need to manually fix the missing data
-   `-` No sync, so past submissions will not be copied over
-   `-` Have to push data on every syncable-action: submit, add question, add response, approve
-   `-` Testing around the API integration is difficult b/c it requires performing a bunch of actions in MC Review to trigger

### Use pub/sub to sync data between app-api and Salesforce

Use GraphQL pub/sub system to sync. Salesforce will subscribe to contracts and rates and all new entries will get sent over. pub/sub will handle retry logic when there are errors.

-   `+` Can be used to sync historical data over
-   `+` Pub/sub supplies tricky retry logic, should be durable
-   `+` If push errors, we still will get data into the system
-   `+` Would call existing app-api API, same way we've asked ARMS to
-   `-` Not instantaneous, probably can't send Salesforce link in submission email
-   `-` GraphQL Pub/Sub is an extension to Apollo, not built in
-   `-` More work to adopt another technology

### Use "External Objects" to create a view of the Postgres tables

Salesforce gets a view of the db tables directly.

-   `+` Everything is sync'd automatically
-   `+` No custom code is required; all configurations are handled through the platform
-   `-` Might be very expensive (5k/table/month?)
-   `-` Ties Salesforce to our db model, which is not designed for public consumption whereas the API is
-   `-` Requires allowing connections from our database to salesforce, a security risk since right now access to the db is very locked down
-   `-` Licenses need to be purchased from day one in the demo org, as trial orgs expire in less than two weeks
-   `-` It is necessary to verify that the connectors are FedRAMP certified at CMS.
-   `-` Bidirectional synchronization must be carefully planned based on the connectors and the external database

### Use use BigMac (Kafka) to sync data between app-api and Salesforce

Use the existing MACPRO system BigMac to sync data. app-api -> BigMac -> Salesforce. 

-   `+` Can be used to sync historical data over
-   `+` Kafka supplies tricky retry logic, should be durable
-   `+` If push errors, we still will get data into the system
-   `+` MACPRO already has multiple data sources going into BigMac, MC Contract data would be another
-   `-` adding another system to the sync process is adding complexity, more pieces to fail
-   `-` We haven't had reason to integrate with BigMac yet, attaching two systems to it just to talk to each other seems wasteful. 
-  `-` Requires coordination with another team

