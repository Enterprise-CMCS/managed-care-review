# HealthPlanFormData Protobuf Migrations

This module contains a script migrate_protos.ts that runs the migrations in ./healthPlanFormDataMigrations on all the protos in our db or all the protos saved as files in a directory.

Usage:
```
# build
../node_modules/.bin/tsc

# run against db running at DATABASE_URL
npx node ./protoMigrations/build/migrate_protos.js db

# run against a directory of .proto files (npx runs as if from the app-api directory)
npx node ./protoMigrations/build/migrate_protos.js files ../app-web/src/common-code/proto/healthPlanFormDataProto/testData

```

## Adding a new migration

Migrations are typescript files that export a single function called "migrateProto" with the signature:
```
export function migrateProto(
    oldProto: mcreviewproto.IHealthPlanFormData
): mcreviewproto.IHealthPlanFormData 
```

To create a new migration, add a new file to the `healthPlanFormDataMigrations` directory with that exported function in it. The function will be called by the migration script for every single proto that is being migrated. The migration is called with a decoded protobuf data in the *generated proto format*, *not* our domain models. This is to provide us with the maximum flexibility for updating proto data. We interact with this format directly in toProto and toDomain, whereas the rest of our app uses our domain models. 

The migration function should return a transformed protobuf which will be written out by the migrator.

Please document the reason for the migration thoroughly in the file.

## Testing migrations

In the proto package, we have a set of old protos saved as files with tests that confirm that they are still decoded correctly with our current code. Those files will all need to be run through your new migration in order for those tests to continue to be accurate, since we will migrate all the protos in our db as well.

The saved protos are located at `/services/app-web/src/common-code/proto/healthPlanFormDataProto/testData` and tests are in the directory one level up. 

These .proto files are generated /automatically/ by the writeNewProtos.test.ts test. If our handful of monitored test *domain models* change how they are written out as a protobuf, this test will write a new proto with the date on it into the testData directory. 

Tests, like the unlockedWithALittleBitOfEverything.test.ts file decode these saved protos and make assertions about them. Any new migration can be tested by writing a test that fails against some of the old .proto files, then running the migration against our testData directory and ensuring that the test now passes. This is the best way to confirm that a migration is going to behave as expected against our live data. 
