# 020 — Use GitHub environments for deployment

GitHub deployment environments are a way of being more intentional around what environment a GitHub Action targets.  They can be configured to match only selected branches (among other conditions) and include environment-specific secrets.  When a workflow job specifies an environment by adding a `jobs.<job_id>.environment` key followed by the name of the environment, any configured conditions have to be met before the job can proceed or get access to the environment secrets. Also, environments get specified in the subject claim of the JWT sent to AWS as part of the OIDC process, so we can verify them on the AWS side as part of OIDC.

There's still room for human error, i.e. there's nothing stopping you from specifying that a workflow that should really only access `dev` can run against `prod`. But it adds a couple of layers of protection.

More info is in the [GitHub documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment#how-environments-relate-to-deployments).

## Considered Options

We could do nothing, which would mean the current approach of relying on the naming convention of secrets (e.g. `DEV_SECRET`) to select the right one and forgoing branch selection rules.

## Chosen Decision
We will start using GitHub environments.  There's a simple one time setup through the UI which includes creating the environment, configuring branch selection rules, and adding environment secrets.

### Pro/Cons
#### GitHub environments
- `+` Allow environment-specific secrets, e.g. `PROD_AWS_ACCOUNT_ID` will not be accessible to a workflow specifying the `dev` environment
- `+` Allow critera for allowed branches, e.g. workflows specifying `prod` environment have to be running on the `main` branch
- `+` Allows setting up subject claims for Github OIDC, e.g. the `prod` OIDC role in AWS specifies that only workflows from the` prod` GitHub environment can assume the role.
- `-` one-time manual setup


#### Do nothing
- `+` simpler (slightly)
- `-` relies on naming conventions of secrets rather than intentional configuration
- `-` no way to configure branch selection



