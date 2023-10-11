# postgres

This service deploys a postgres database in Amazon Aurora Serverless. It also deploys an ec2 instance into the VPC as a jump box to get to the Aurora instance in situations where CLI access in needed (it stays powered off until needed).

## dependencies

None. The database is configured and built in the [`app-api`](../app-api) service.

## Fixing Migration Failures and access to AWS Jump Box

Prisma does not wrap database migrations in transactions, which means a failed migration can leave our database in a bad state. We decided to require that all developers on the team wrap migrations in transactions manually (with some checking from linters and Danger Bot), but we still may have situations arise that we need to mend the Prisma migrations table.

Prisma recommends a couple strategies [in their docs](https://www.prisma.io/docs/guides/migrate/production-troubleshooting), which will need to be chosen depending on the nature of the migration failure.

### Jump box access

Since we're in a serverless environment running Aurora Postgres Serverless in a VPC that is not accessible to the public Internet, running the `npx prisma diff` commands that are outlined in the prisma docs is not possible from a local development environment. In the case that this strategy is needed, we've deployed ec2 VMs in each of dev, val, and prod that are in the same VPC as our Aurora DBs. We keep the instance shut down, but it can be turned on from the AWS Console and connected to by sshing into the instance:

#### Start the instance in AWS Console

1. Navigate to ec2 in the AWS Console. You must be on the CMS VPN to access this.
2. Locate the instance in the list (there should only be one) and click into it.
3. From the `Instance state` dropdown menu in the top right, select `Start instance`.

#### Add your IP to the security group

CMS scans security groups and changes rule sets that are deemed too permissive. That means we have to add our IP addresses to what is essentially an allowlist for ssh access to the VM.

1. Determine your public facing IP address. An easy way to do this is to `curl https://ifconfig.me/`
2. Locate the EC2 instance in the AWS console. Click into the security groups.
3. There should be two security groups attached to the instance, the default and the postgres one. Select the postgres security group.
4. On the `Inbound rules` tab select `Edit inbound rules`
5. Add a rule for `ssh` with the `source` set to your local IP address with `/32` appended to it (e.g. `1.2.3.4/32`)
6. Save the rule

#### SSH to the instances

You should now be able to ssh to the jump box.

1. Locate the public IP address of the instance. This can be found on by clicking into the VM on the `Instances` section of the EC2 console.
2. ssh ubuntu@public-ip

You should be using public key auth to ssh. If you need to point to your private key, use `ssh -i ~/.ssh/${yourkeyfile} ubuntu@public-ip`

#### Accessing Postgres from the jumpbox for Prisma

You can get the connection credentials for the Aurora DB from AWS Secrets Manager:

1. Navigate to secrets manager in the AWS Console
2. Find the deployment that is associated with the Aurora DB (e.g. `aurora_postgres_prod`)
3. Scroll down to `Retreive Secret Value` and click that button.
4. You will now see the aurora host name, db name, port, hostname, and password.

Once you have that information and are on the instance via ssh, you can set the Prisma `DATABASE_URL` env var, for example:

`export DATABASE_URL=postgresql://username:pass@hostname:3306/dbname` #pragma: allowlist secret

You'll probably need to `git clone` or `git pull` the repository down from github and run a `yarn install` in the repository root to get things up to date.

You can now use `npx prisma diff` and the other [prisma tools](https://www.prisma.io/docs/guides/migrate/production-troubleshooting) to fix up the failed migration.

#### Accessing Postgres from the jumpbox for psql

You'll need to find the connection credentials from Secrets Manager, as outlined above. You can then use the `psql` CLI tool to connect directly to the postgres console:

`psql -h $hostname -p 3306 -U $username -d $dbname`

You then will be prompted for a password, after which you should be on the postgres CLI.
