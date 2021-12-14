# 002 — Deploy infra with the Serverless framework

"Infrastructure as code" is a modern best practice wherein we define all the infra required to run our application in code, rather than configuring infra by hand in, say, the AWS console. There are several different tools that can be used to deploy infrastructure from code, we should pick one that meets our needs.

## Considered Options

### Serverless for everything

The Serverless framework is designed to make deploying serverless code simple on any platform. It has a wide array of plugins to make that process easy. It also has the ability to deploy any AWS service by embedding CloudFormation syntax in its serverless.yaml. The current guide-wire app is using serverless to deploy all services.

### Terraform for everything but lambdas

Terraform is its own infrastructure specification language and a tool for deploying that specification to the cloud. It is purpose built for managing all your infrastructure and has lots of tooling built around tracking the current state and how to modify it. We would use Terraform to manage all of our infra with the exception of our lambdas. Serverless will still deploy our lambdas for us, it's designed specifically for it.

## Chosen Decision

Use Serverless to deploy everything. MACPRO is working to rewrite a series of services and maintaining consistency between deployments is a priority. Rather than introduce a separate way to deploy infra, we will rely on Serverless's ability to deploy CloudFormation directly to deploy all our infra along with our application code. This will keep our deploy scripts simple and continue to keep us in line with the next door projects's infra.

### Pro/Cons

#### Serverless For Everything

-   `+` One less technology to manage
-   `+` References between different services is handled by serverless variables
-   `+` Plugins let you run services locally configured the same way they will be configured in production
-   `+` serverless for everything is how the sample-app that is being used inside CMS is started, so there is consistency between different teams in MACPro
-   `-` Depending on how its configured, references in serverless.yml require hitting AWS even to run lambdas offline
-   `-` Breaking all our dependent services out into separate serverless deploys makes it more likely for a partial deploy to happen that is hard to roll back

#### Terraform For Everything But Lambdas

-   `+` All of our infra will be defined in a single place, with a single entry point
-   `+` Terraform has sophisticated tools for managing state and making change plans, across the team
-   `+` Terraform deploys will consider all of our infrastructure when it deploys instead of deploying services piecemeal
-   `+` Terraform has a large set of open source recipes to leverage to ensure that good defaults are being set for various services
-   `+` Terraform is a declarative language with lots of explicit binding between services.
-   `-` We will be out of step with the rest of the MACPro program, which will make it harder for their approval to apply to us.
-   `-` We'll have to build our own local running solutions
