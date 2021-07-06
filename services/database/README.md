# database

This service is a lambda that deploys database to AWS DynamoDB. Anytime a new database table is added, it also needs to be set up here.  

## Significant dependencies

None. The database is configured and built in the [`app-api`](../app-api) service.
