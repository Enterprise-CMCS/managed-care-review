# 010 — Use Prisma to connect to postgres

As explained in a [previous ADR](./008-move-to-postgres.md), we are moving to using postgres as our database on MC Review. This means we need to pick a library to connect to the database from our Typescript API code. Additionally we'll need a way to run migrations when we make changes to the database as part of development.

## Considered Options

### Prisma

[Prisma](https://prisma.io/) is a widely adopted library that manages the whole enchilada. It uses its own schema file to define tables and relationships and then generates code for running queries based on that schema as well as migrations to bring the current db into sync with the one described in the schema. It has good documentation and is a very popular choice for folks doing js/ts development on the backend.

### Slonik

[Slonik](https://github.com/gajus/slonik) is a robust Typescript Postgres client. It has code for making connections and executing raw SQL statements safely. It would require us writing our own mechanism for tracking migrations, and it doesn't have support for typing the results of queries automatically. We would likely need to do runtime type validation on the result of every query.

### PgTyped

[PgTyped](https://pgtyped.vercel.app/) is a postgres client that reads your local database to generate types for your database. You write raw SQL queries and then PgTyped generates typescript code that invokes those queries. This would let us write raw SQL queries but still have types in the typescript code that correspond to the results of those queries.

## Chosen Decision: Use Prisma

Overall, this decision came down mostly on the side of not spending any more innovation tokens on this subject. Using Slonik or PgTyped would let us communicate with the database more directly in SQL, reducing the abstractions we have between us and the database and allowing us to easily rely on the full feature set of postgres in raw SQL. However, both libraries have much less adoption compared to Prisma and it doesn't seem worth it right now to do the extra work it would take to figure out what the right patterns are for using those libraries. Vs. Prisma which has very good docs and tutorials. Prisma is an easy choice and we're doing enough new stuff right now not to try something harder here.

### Pro/Cons

#### Prisma

-   `+` wide adoption implies fewer dark corners of the code base
-   `+` provides migrations
-   `+` generates typesafe code for interacting with the db
-   `+` supports Raw SQL queries if need be
-   `–` is more of an ORM than the other options. If careless we could write expensive queries without understanding how they translate from prisma

#### Slonik

-   `+` write raw SQL to talk to postgres
-   `–` no types for the actual tables we use
-   `–` no migration plan

#### PgTyped

-   `+` Write raw SQL queries
-   `+` types in typescript
-   `–` no migration plan
-   `–` low adoption
