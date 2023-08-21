# postgres

This service deploys a postgres database in Amazon Aurora Serverless. It also deploys an ec2 instance into the VPC as a jump box to get to the Aurora instance in situations where CLI access in needed (it stays powered off until needed).

## dependencies

None. The database is configured and built in the [`app-api`](../app-api) service.

## Fixing Migration Failures

Prisma does not wrap database migrations in transactions, which means a failed migration can leave our database in a bad state. We decided to require that all developers on the team wrap migrations in transactions manually (with some checking from linters and Danger Bot), but we still may have situations arise that we need to mend the Prisma migrations table.

Prisma recommends a couple strategies [in their docs](https://www.prisma.io/docs/guides/migrate/production-troubleshooting), which will need to be chosen depending on the nature of the migration failure.

Since we're in a serverless environment running Aurora Postgres Serverless in a VPC that is not accessible to the public Internet, running the `npx prisma diff` commands that are outlined in the prisma docs is not possible from a local development environment. In the case that this strategy is needed, we've deployed ec2 VMs in each of dev, val, and prod that are in the same VPC as our Aurora DBs. We keep the instance shut down, but it can be turned on from the AWS Console and connected to by sshing into the instance:

1. Navigate to ec2 in the AWS Console.
2. Locate the instance in the list (there should only be one) and click into it.
3. From the `Instance state` dropdown menu in the top right, select `Start instance`.
4. Locate the public IP address of the instance
5. ssh ubuntu@public-ip

You can then get the connection credentials for the Aurora DB from AWS Secrets Manager:

1. Navigate to secrets manager in the AWS Console
2. Find the deployment that is associated with the Aurora DB (e.g. `aurora_postgres_prod`)
3. Scroll down to `Retreive Secret Value` and click that button.
4. You will now see the aurora host name, db name, port, hostname, and password.

Once you have that information and are on the instance via ssh, you can set the Prisma `DATABASE_URL` env var, for example:

`export DATABASE_URL=postgresql://username:pass@hostname:3306/dbname` #pragma: allowlist secret

You'll probably need to `git clone` or `git pull` the repository down from github and run a `yarn install` in the repository root to get things up to date.

You can now use `npx prisma diff` and the other [prisma tools](https://www.prisma.io/docs/guides/migrate/production-troubleshooting) to fix up the failed migration.
