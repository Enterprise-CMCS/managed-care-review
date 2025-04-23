# How to complete migrations

## Background

Migrations are a controlled way to change existing records in the database or else change the shape of tables/relationships. They are necessary when fields are added, removed, or when the meaning behind fields and their relationships change.

## Prepare for migration

Data migrations change existing records in the database. Here are steps to prepare for a data migration.

1. Define clear acceptance criteria and QA steps early
    - How do you know migration applied?
    - What will be checked either in the app, via api request, or in the reports CSV?
    - Developers may have to verify that the change worked multiple timesas migration through different environments.

1. Prepare for manual testing in lower environments.
    - Build a PR review app off `main` to start out to get Cypress running.
    - Prepare local environment by [dumping VAL database](#how-to-dump-val-data-for-local-testing) and relying on that for local runs.

### Prisma schema migrations

Schema migrations are changes to the database models and relationships. If you want to test that schema before you generate the migration.  you can use the [`./dev prisma -- db push`](https://www.prisma.io/docs/guides/database/prototyping-schema-db-push) to make the changes to your current database and generate the matching PrismaClient.

When you're happy with your schema.prisma, use [`./dev prisma -- migrate dev`](https://www.prisma.io/docs/concepts/components/prisma-migrate) to generate a new migration file. (if you have run `prisma db push` you will have to wipe your local db to do so). That file gets checked in and used to make the changes in all other environments.

If you are going to need to modify the migration that prisma generates you can use `./dev prisma -- migrate dev --create-only`. That will generate the migration file but not actually apply it to the database. `./dev prisma -- migrate dev` will apply it.

Whenever you run `./dev postgres` we start a new postgres docker container and run `prisma migrate reset --force` to clean it out and run all of our checked in migrations there. After that you should be ready to develop.

## How to dump deployed data for local testing

1. Connect to Aurora Postgres via AWS Jump Box. [Instructions](../../services/postgres/README.md#access-to-aurora-postgres-via-aws-jump-box)

2. Use `./dev jumpbox clone [environment]` to clone the environment database to your local machine. This command will log into the jumpbox, dump the db into a file in the format `dbdump-[environment]-[date].sqlfc`, and copy that file locally.

2. Load that db dump into your local running postgres instance.
   - Copy the dump file to the `mc-postgress` docker container by running the command `docker cp dbdump-[env]-[date].sqlfc mc-postgres:/` from where the file is located.
   - Then run the command `docker exec -it mc-postgres pg_restore -h localhost -p 5432 -U postgres -d postgres --clean dbdump-[env]-[date].sqlfc`. You will be promoted to enter in local db password `shhhsecret`. You will see print out errors but the database has spun up successfully.
