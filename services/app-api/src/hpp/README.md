# Summary

This directory contains code for decoding data from our deprecated database tables `HealthPlanPackageTable` and `HealthPlanRevisionTable`. The `HealthPlanPackageTable` stored submissions and has been migrated to `ContractTable`. The `HealthPlanRevisionTable` has been migrated to `ContractRevisionTable`.

We cannot conclusively validate that all rate data was migrated to `RateTable`, so we must retain this data to meet data retention requirements. We plan to decode the data and store it as JSON strings, which will allow us to remove the remaining Protobuf code and packages. Until then, we must retain both the database data and the code in this directory to perform that migration.

## Encoded data

`HealthPlanRevisionTable` stores submission form data as binary data in Protobuf format. This deprecated storage method has been replaced with relational tables. The Protobuf data contains all contract and rate form data. While we validated that all contract data migrated to `ContractRevisionTable`, we could not validate complete migration of rate data to `RateTable` and `RateRevisionTable`.

Due to data retention requirements, we cannot delete this deprecated data without validation of complete migration. The solution is to decode the form data into JSON and migrate `HealthPlanRevisionTable` to store JSON strings instead of encoded Protobuf.

## Post migration clean-up
After we have migrated the Protobuf data into JSON data in our database, this entire directory can be deleted. Any packages for Protobuf can be removed.

No other files, other than the lambda for the migration work, should import any code from this directory.
