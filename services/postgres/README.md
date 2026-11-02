# Postgres

This service deploys a postgres database in Amazon Aurora Serverless. It also deploys an ec2 instance into the VPC as a jump box to get to the Aurora instance in situations where CLI access in needed (it stays powered off until needed).

## Dependencies

None. The database is configured and built in the [`app-api`](../app-api) service.

## RDS TLS certificates

`DatabaseClient` reads `/var/runtime/ca-cert.pem`, the Amazon CA bundle supplied by the managed Node.js Lambda runtime. It does not download certificates at runtime. The bundle is passed directly to the PostgreSQL client with `rejectUnauthorized: true`; no `NODE_EXTRA_CA_CERTS` setting or bundling changes are needed.

AWS maintains this bundle through Lambda runtime updates. We do not keep a certificate bundle in this repository. AWS notes that certificates for newly launched Regions can take up to four weeks to reach managed runtimes. See [Lambda's RDS certificate documentation](https://docs.aws.amazon.com/lambda/latest/dg/services-rds.html#rds-lambda-certificates).

For execution outside a managed Lambda runtime, set `RDS_CA_BUNDLE_PATH` to a local, trusted AWS RDS PEM bundle, for example:

```sh
export RDS_CA_BUNDLE_PATH=/absolute/path/to/rds-bundle.pem
```

Missing, unreadable, or empty bundles cause connection setup to fail. There is no fallback download or disabled certificate verification. Container deployments must supply their own bundle and set this path.

Run the focused unit tests with `pnpm --filter postgres test:once`. A deployed review-environment connection should also be checked before promoting this change.

### Access to Aurora Postgres via AWS Jump Box

See [howto-access-deployment-database](../../docs/technical-design/howto-access-deployment-database.md) documentation to access Postgres using the dev_tool.

### Fixing Prisma migration issues

Prisma does not wrap database migrations in transactions, which means a failed migration can leave our database in a bad state. We decided to require that all developers on the team wrap migrations in transactions manually (with some checking from linters and Danger Bot), but we still may have situations arise that we need to mend the Prisma migrations table.

Prisma recommends a couple strategies [in their docs](https://www.prisma.io/docs/guides/migrate/production-troubleshooting), which will need to be chosen depending on the nature of the migration failure.
