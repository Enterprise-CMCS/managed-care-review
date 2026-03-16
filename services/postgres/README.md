# Postgres

This service deploys a postgres database in Amazon Aurora Serverless. It also deploys an ec2 instance into the VPC as a jump box to get to the Aurora instance in situations where CLI access in needed (it stays powered off until needed).

## Dependencies

None. The database is configured and built in the [`app-api`](../app-api) service.

### Access to Aurora Postgres via AWS Jump Box
See [howto-access-deployment-database](../../docs/technical-design/howto-access-deployment-database.md) documentation to access Postgres using the dev_tool.

### Fixing Prisma migration issues

Prisma does not wrap database migrations in transactions, which means a failed migration can leave our database in a bad state. We decided to require that all developers on the team wrap migrations in transactions manually (with some checking from linters and Danger Bot), but we still may have situations arise that we need to mend the Prisma migrations table.

Prisma recommends a couple strategies [in their docs](https://www.prisma.io/docs/guides/migrate/production-troubleshooting), which will need to be chosen depending on the nature of the migration failure.
