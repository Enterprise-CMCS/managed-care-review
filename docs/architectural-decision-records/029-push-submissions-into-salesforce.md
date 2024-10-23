# Push Submission Data Into Salesforce

In order for CMS users to be able to review submissions in Salesforce, all submission need to be in the Salesforce database. We will first get data into Salesforce by calling Salesforce APIS from app-api on every submission. Other data sync strategies may follow. 

### Decision Drivers

- Data needs to get into Salesforce automatically, not by manually copying data over from the web portal. 
- It needs to be in the Salesforce review system within an hour or so
- We would like to be able to include a link to the Salesforce record in the email we send on submission
- We can rely on Salesforce's builtin change tracking so we don't need to send over revisions, just per-contract and per-rate data
- Source of truth for all submission data will be the web portal, no edits will be allowed in Salesforce, only review information will be entered there. 


## Options

### Chosen: Push data into Salesforce from app-api on submission

Salesforce has a few different API options for sending data into its database from outside. We can make a REST call from app-api as part of our submission handler. This will send data into Salesforce immediately at submission time, there will be no gap. On resubmission we will send over the new data. 

-   `+` Data is sync'd to Salesforce immediately 
-   `+` Get to write a single API call, no diffing with existing data required
-   `+` Get data back immediately, can send links to Salesforce in submission email
-   `-` No sync, if any calls fail we need to manually fix the missing data
-   `-` No sync, so past submissions will not be copied over
-   `-` Have to push data on every sync-action: submit, add question, add response


### Use pub/sub to sync data between app-api and Salesforce

Use GraphQL pub/sub system to sync. Salesforce will subscribe to contracts and rates and all new entries will get sent over. pub/sub will handle retry logic when there are errors.

-   `+` Can be used to sync historical data over
-   `+` Pub/sub supplies tricky retry logic, should be durable
-   `+` If push errors, we still will get data into the system
-   `+` Would call existing app-api API, same way we've asked ARMS to
-   `-` Not instantaneous, probably can't send Salesforce link in submission email
-   `-` requires writing more code in Salesforce
-   `-` GraphQL Pub/Sub is an extension to Apollo, not built in


### Use use BigMac (Kafka) to sync data between app-api and Salesforce

Use the existing MACPRO system BigMac to sync data. app-api -> BigMac -> Salesforce. 

-   `+` Can be used to sync historical data over
-   `+` Kafka supplies tricky retry logic, should be durable
-   `+` If push errors, we still will get data into the system
-   `+` MACPRO already has multiple data sources going into BigMac, MC Contract data would be another
-   `-` adding another system to the sync process is adding complexity, more pieces to fail
-   `-` We haven't had reason to integrate with BigMac yet, attaching two systems to it just to talk to each other seems wasteful. 

