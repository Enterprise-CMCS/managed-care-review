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
    - Build a PR review app off `main` to start out so we get Cypress running.
      - The cypress runs will create data before migrations to validate the migration.
    - Prepare local environment by [dumping a deployment database](howto-access-deployment-database.md#cloning-deployment-database-to-local-machine) and relying on that for local runs.
      - The val deployment has the most similar data to prod.

### Prisma schema migrations

Schema migrations are changes to the database models and relationships. If you want to test that schema before you generate the migration.  you can use the [`./dev prisma -- db push`](https://www.prisma.io/docs/guides/database/prototyping-schema-db-push) to make the changes to your current database and generate the matching PrismaClient.

When you're happy with your schema.prisma, use [`./dev prisma -- migrate dev`](https://www.prisma.io/docs/concepts/components/prisma-migrate) to generate a new migration file. (if you have run `prisma db push` you will have to wipe your local db to do so). That file gets checked in and used to make the changes in all other environments.

If you are going to need to modify the migration that prisma generates you can use `./dev prisma -- migrate dev --create-only`. That will generate the migration file but not actually apply it to the database. `./dev prisma -- migrate dev` will apply it.

Whenever you run `./dev local --postgres` we start a new postgres docker container and run `prisma migrate reset --force` to clean it out and run all of our checked in migrations there. After that you should be ready to develop.
