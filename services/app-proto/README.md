# app-proto

This service compiles protobufs, with types, for use as the mc-review state submissions data model. It contains a schema for the submissions data and functions for converting between protobuf and Typescript domain models.

[Protocol buffers](https://developers.google.com/protocol-buffers), also called protobufs, are Google's language-neutral, platform-neutral, extensible mechanism for serializing structured data.

To read about the strategy behind using protobufs for encoding state submission data, see our ADRs on the subject: [Form Data Model Serialization](../../docs/architectural-decision-records/008-form-data-serialization.md) and [Decide on data serialization approach for submission data](../../docs/architectural-decision-records/009-data-serialization-framework.md)

In short: our submission form data is complex nested data that is slowly changing over time, needs to be able to read old versions, and is usually accessed as a single piece in the course of review. Protobuf is a well defined serialization format that gives us type and key name safety along with the ability to read old protos without blowing up. By storing that directly in postgres, we are able to keep all of our form data in one piece. We won't have to maintain migrations for every data model change and saving new versions of the proto is as simple as adding another row to the table.

## Significant dependencies

We use [protobuf.js](https://github.com/protobufjs/protobuf.js) to generate javascript code for reading and writing protobufs based on the schema defined in /src/state_submission.proto

To read about the code we wrote that converts our domain models to and from protobuf, check out the [stateSubmission package](https://github.com/Enterprise-CMCS/managed-care-review/tree/main/services/app-web/src/common-code/proto/healthPlanFormDataProto)

# HealthPlanFormData Protobuf Migrations

This module contains a script migrate_protos.ts that runs the migrations in `./protoMigrations/healthPlanFormDataMigrations` on all the protos in our db or all the protos saved as files in a directory.

Usage:

```
# build
../node_modules/.bin/tsc

# run against db running at DATABASE_URL
npx node ./protoMigrations/build/migrate_protos.js db

# run against a directory of .proto files (npx runs as if from the app-proto directory)
npx node ./protoMigrations/build/migrate_protos.js files ../app-web/src/common-code/proto/healthPlanFormDataProto/testData

```

## Adding a new migration

Migrations are typescript files that export a single function called "migrateProto" with the signature:

```
export function migrateProto(
    oldProto: mcreviewproto.IHealthPlanFormData
): mcreviewproto.IHealthPlanFormData
```

To create a new migration, add a new file to the `healthPlanFormDataMigrations` directory with that exported function in it. The function will be called by the migration script for every single proto that is being migrated. The migration is called with a decoded protobuf data in the _generated proto format_, _not_ our domain models. This is to provide us with the maximum flexibility for updating proto data. We interact with this format directly in toProto and toDomain, whereas the rest of our app uses our domain models.

The migration function should return a transformed protobuf which will be written out by the migrator.

Please document the reason for the migration thoroughly in the file.

## Testing migrations

In the proto package, we have a set of old protos saved as files with tests that confirm that they are still decoded correctly with our current code. Those files will all need to be run through your new migration in order for those tests to continue to be accurate, since we will migrate all the protos in our db as well.

The saved protos are located at `/services/app-web/src/common-code/proto/healthPlanFormDataProto/testData` and tests are in the directory one level up.

These .proto files are generated /automatically/ by the writeNewProtos.test.ts test. If our handful of monitored test _domain models_ change how they are written out as a protobuf, this test will write a new proto with the date on it into the testData directory.

Tests, like the unlockedWithALittleBitOfEverything.test.ts file decode these saved protos and make assertions about them. Any new migration can be tested by writing a test that fails against some of the old .proto files, then running the migration against our testData directory and ensuring that the test now passes. This is the best way to confirm that a migration is going to behave as expected against our live data.
