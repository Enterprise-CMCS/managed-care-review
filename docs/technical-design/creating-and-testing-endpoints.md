# How to create or test an endpoint

There are two types of endpoints in our app. One uses GraphQL, the other creates AWS Lambda handlers.

**When we want to fetch or update information relevant to the app itself--think of submissions, or user info--we'll typically use GraphQL.**

**When we want to communicate with a service like New Relic, download a file, or, for example, to set up a health-check endpoint, we'll use a handler.**

The relative merits of each approach should become clear below.

## GraphQL

The major mental shift in using GraphQL, in contrast to RESTful services, is that you have to _begin_ by thinking of the data you want returned. With REST, it's common to hit an endpoint, get back a large JSON, browse through it, and then, in the application code, whittle it down, or pluck the bits that you need. But we'll construct our [GraphQL operations (queries and mutations)](https://graphql.org/learn/queries/) to return exactly what we need, before we hit the application code at all.

### Apollo Studio Explorer
[Apollo Explorer tool](https://www.apollographql.com/docs/graphos/explorer/) is a web-based IDE for writing and executing GraphQL operations on our deployed GraphQL API, with features such as schema referencing, query linting, autocomplete, and a jump-to-definition tool. With this tool we can test and write GraphQL operations without the need of front-end UI to execute the operation.

We have two ways to access the Apollo Explorer tool:

**Embedded GraphQL Explorer Tool**:
>In all environments, except `prod`, we have embedded the Apollo Explorer Tool into the MC-Review app. We embedded the tool into the app to simplify authorization configuration for `dev` and `val` environments. By doing so, we can programmatically configure the tool's authorization, eliminating the need for manual configuration by the user.
>
>Accessing and using the embedded tool:
>- Log into the MC-Review app with the user that can perform the operations you want to test
>   - Depending on the user, performing certain GraphQL operations will be restricted. The operation authorization is done in the resolvers, `services/app-api/src/resolvers`.
>   - For example, a state user will not be allowed to unlock a submission. The GraphQL operation will return an unauthorized error.
>- Once logged in, input this url `[hostname]/dev/graphql-explorer` to access the tool.
>- Create a new workspace in the operations editor to build a new request (`+` sign in main editor).
>- Use the Documentation panel to create your request. Walk through the schema and select fields to add to your request. Add any input parameters in the `variables` section. For more on usage of the query builder see [video tutorial](https://www.youtube.com/watch?v=j8b0Bda_TIw).
>- If you need to make quickly decode/encode and make changes to protos use [ProtobufPal](https://www.protobufpal.com/). This tool should be used only with test and anonymized data (don't feed any private data in here).

**External Apollo Explorer Tool**:
>Apollo Explorer is embedded in the local deployment, so there's no need to access it externally, except in rare cases like executing GraphQL operations as user role `ADMIN_USER` when no users with that role has been added.
>
>To connect Apollo Explorer to our local GraphQL api, we must manually configure connection settings in the Explorer tool.
>
>Access the external tool (Only applicable to `local` deployment):
>- Visit the tool at `https://studio.apollographql.com/sandbox/explorer`.
>- Top left of the browser, the `SANDBOX` input field will have a gear icon.
>- Click on this gear icon to open `Connection settings` modal.
>- In the modal input our local GraphQL endpoint `http://localhost:3030/local/graphql` into the `Endpoint` field.
>- Under `Shared headers` we will need to configure our cognito authentication.
>   - There are two inputs in the `Shared headers`  section, the first is `header` name field and second is the `value`.
>   - For the `header` name field it should be `cognito-authentication-provider`.
>   - For the `value` field, you can paste in the following for each user's authentication.
>     - Admin User Iroh: `{"id":"user4","email":"iroh@example.com","givenName":"Iroh","familyName":"Coldstart","role":"ADMIN_USER"}`
>     - CMS User Zuko: `{"id":"user3","email":"zuko@example.com","givenName":"Zuko","familyName":"Hotman","role":"CMS_USER","stateAssignments":[]}`
>     - State User Aang: `{"id":"user1","email":"aang@example.com","givenName":"Aang","familyName":"Avatar","role":"STATE_USER","stateCode":"MN"}`
>     - State User Toph: `{"id":"user2","email":"toph@example.com","givenName":"Toph","familyName":"Beifong","role":"STATE_USER","stateCode":"VA"}`
>   - Click the save button, and you should see a green dot with our endpoint inside the `SANDBOX` input field.

With configuration finished you should now be able to write queries and mutation to hit our resolvers.

### Defining the type

Of course, we have to have a good idea of what data is available to us before we can define our return type. In the MC-Review app, the database is the source of all our data, so we can see what's available by inspecting the `schema.prisma` file, which describes the database structure.

Examine the model for a `State`. To keep this example as simple as possible, let's return the name of the first state in our database.

#### The GraphQL query

_**We'll create a new `.graphql` file in `/app-graphql/src/queries/dataExport.graphql`**_.

We need to give our operation a name; let's use `dataExport`. Our query might look like this.

```graphql
query dataExport {
    dataExport {
        name
    }
}
```

`query` is the _operation type_. It's used to retrieve data. (We could also have a `mutation`, to change data, or a `subscription`, which is like a websocket, in that it maintains a connection to keep piping changing data.)

`dataExport` is the _operation name_.

We're telling GraphQL that we want a query called dataExport, which returns a field called "name".

#### The GraphQL schema

_**We'll also add our query and its return type to `/app-graphql/src/schema-graphql`**_

First, we'll add the type

```graphql
type DataExport {
    name: String!
}
```

And then, on the `Query` type, we'll add our new method

```graphql
dataExport: DataExport
```

#### Generating our types

Once we've told GraphQL what query we want and described that data's return type, we can generate type information that can be shared between the web and api layers. We have a generated file at `/app-web/src/gen/gqlClient.tsx`, which contains graphQL types that we can use in the front end.

_**On the command line, navigate to `/services/app-graphql`.**_
_**Run `yarn gqlgen`**_

The generated file isn't checked into source control, but if you look inside, you'll now find a new type that you can use on the front-end if necessary.

```typescript
export type DataExport = {
    __typename?: 'DataExport'
    name: Scalars['String']
}
```

#### The domain model

We use Typescript in our app, so all the data flowing from GraphQL through the api layer to the front end must also have a type. We keep the types that are shared between the api layer and the front end in our domain models.

_**Create a new domain model in `/app-api/src/domain-models/DataExport.ts`**_ Put the following type in it.

```typescript
export type DataExportType = {
    name: string | undefined
}
```

You can think of this as the mirror-image of the GraphQL query, but for the application code.

### Retrieving from the database

#### The Prisma query

Now let's get the data that we want.

_**Create a new file: `/app-api/src/postgres/dataExport.ts`**_. We use [Prisma to query the database](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries).

```typescript
import { PrismaClient } from '@prisma/client'
import { DataExportType } from '../domain-models/DataExport'

export async function dataExport(
    client: PrismaClient
): Promise<DataExportType | undefined> {
    const result = await client.state.findFirst()
    if (result === undefined) {
        return undefined
    }
    return {
        name: result?.name,
    }
}
```

Recall the `schema.prisma` file. We're saying, in the `State` model (`client.state`, in this snippet), get the first record. From that result, give us the `name` field, and we'll assign it to a key of `name` in the object that we return. (Note that our object key can be whatever we want (as long as it matches the types we just made). It doesn't have to match the property name from the result, but in many cases that will make the most sense.)

Also note that here we need the DataExportType that we just created in the domain model.

#### Adding our method to the Store

We handle the database actions through an exported "Store", rather than calling the methods directly.

Once we've defined this Prisma method, we can add it to our store, which will in turn make it available to our resolvers.
_**Go to `/app-api/src/postgres/postgresStore.ts`**_.
We'll import both the Prisma query we just made, as well as the domain-model type we created earlier.

```typescript
import { dataExport } from './dataExport'
import { DataExportType } from '../domain-models/DataExport'
```

Next we'll add a new method both to the `Store` type, and the `NewPostgresStore`. First, in the type:

```typescript
dataExport: () => Promise<DataExportType | undefined>
```

And then in the NewPostgresStore:

```typescript
dataExport: () => dataExport(client),
```

When we access the store in our app, the dataExport method we defined above will be available to us.

### Creating the resolver

We use Apollo Client to interface with our data source and to provide information from the store to the front-end; the methods to do that are called ["resolvers"](https://www.apollographql.com/docs/apollo-server/data/resolvers/).
_**Create `/app-api/src/resolvers/dataExport.ts`**_.
Here's the code.

```typescript
import { QueryResolvers } from '../gen/gqlServer'
import { Store } from '../postgres'

export function dataExportResolver(store: Store): QueryResolvers['dataExport'] {
    return async (_parent, context) => {
        const name = await store.dataExport()
        if (name === undefined) {
            return {
                name: undefined,
            }
        }
        return name
    }
}
```

The method we just put on the store gets called here. It will return the result of client.state.findFirst() that we defined above. The return type of `QueryResolvers['dataExport']` is a little mysterious. `QueryResolvers` is a generated file that will include the resolver we're defining here. We'll go over how to generate `QueryResolvers` a little further down.

Now we have to add this resolver to our resolver configuration, so that it can be used on the front end.

_**Go to `/app-api/src/resolvers/configureResolvers.ts`**_

We'll import the resolver we just created.

```typescript
import { dataExportResolver } from './dataExport'
```

And also add it to the Resolvers object. We've made a query, so this line will be added to the query methods.

```typescript
dataExport: dataExportResolver(store),
```
### Generating prisma code and types

Once we have our backend code in place, if we've modified the prisma schema (we did not, in this example), we need to run another generate command.

_**On the command line, navigate to `/services/app-api`**_
_**Run `yarn prisma generate`**_

or from the root run  `./dev generate` which includes prisma code generation

This command will create `node_modules/.prisma/client/index.d.ts`

### Generating graphql types
_**On the command line, navigate to `/services/app-graphql`**_
_**Run `yarn gqlgen`**_

or from the root run `./dev generate` which includes graphql types code generation

Either set of commands will create `app-api/gen/gqlServer.d.ts` used for types on backend as well as `app-web/gen/gqlClient.d.ts` used for types on frontend. The tool for this is set up in the `app-graphql` service.
### Getting data on the front end

One result of the code generation commands a React hook that we can use on the front end to call our new resolver. The name of the hook will be of the form _useWhatYourResolverIsCalledQuery_ (it will end with "Mutation" if that's what you've created). You can pull it in and get data.

```typescript
import { useDataExportQuery } from '../../gen/gqlClient'
const { data, loading, error } = useDataExportQuery()
```

### Special case: Add resolver to return custom data type

In GraphQL, resolvers can return resolvers. We can use this pattern to have our resolvers return types that are defined outside GraphQL. This is more advanced pattern for dealing with major data entities with types we use across the stack but want GraphQL  to still understand and return.

For example of this, look at the `User` resolver types. We have a `stateUserResolver`  and a `cmsUserResolver`. These are not queries or mutations, they are just resolvers that add additional data to our graph.

Specifically, `cmsUserResolver` adds `stateAssignments` to CMS users returned from `fetchCurrentUser` addd `state` to the state users.

This is set up in `configureResolvers` just like basic resolvers. In addition, there is code added to `codegen.yml` the config file for our graphql-to-typescript dependency.
    - See `mappers` key in `codegen.yml`. By adding the specific typescript definition we want to be returned, we ensure that our GRAPHQL resolvers return types match types elsewhere in the application.

Again, this isn't needed for every piece of data returned by GraphQL. It is useful when dealing with those data model types that persist through the frontend and backend. They may have long definitions or validators set up outside both Prisma and GraphQL (like health plan package which is defined by proto or rates and contracts which are defined in zod).


## Lambda

We use AWS Lambda to build RESTful endpoints in our application. When we create a lambda handler, serverless will add a new Lambda function for us in AWS. If we configure it correctly, that function will have access to things like our postgres database, which itself is hosted on AWS.

### Serverless configuration

Here is an example of serverless configuration for a Lambda that handles an api request, found in `/services/app-api/serverless.yml`.

```yaml
reports:
    handler: src/handlers/reports.main
    events:
        - http:
              path: reports
              method: get
              cors: true
              authorizer: aws_iam
    layers:
        - !Ref PrismaClientEngineLambdaLayer
        - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-2-0:1
    vpc:
        securityGroupIds:
            - ${self:custom.sgId}
        subnetIds: ${self:custom.privateSubnets}
```

The code that runs when this handler is called is in `/app-api/src/handlers/reports.ts`.

The handler points to `/app-api/src/handlers/reports.main`. We're telling the handler where to look for the file that contains the code that will run in the lambda (`src/handlers`) and also the name of the function (`main`). In `reports.ts` the exported handler is called `main`. The location and exported method of `reports.ts` have to match what's specified on the `handler:` line in our YAML file.

We also provide a `path`. This handler will run when someone navigates to the site's base name, slash reports. For prod, it would be `https://mc-review.onemac.cms.gov/reports`.

The `authorizer` line tells AWS that this method can only be invoked by a user who is logged in and has permissions set in AWS IAM. This will typically flow from someone being a state or CMS user, with permission to interact with the main site.

`layers` tie this handler to services that it needs. A lambda layer is basically a collection of code that stays in AWS and doesn't need to be uploaded or updated with each deployment. It's an efficient way to make dependencies available without having to upload and build them each time. In the case of our example, we need database access, so we include our Prisma layer, and we're also tying in to `otel`, our open telemetry service, for observability.

In order to communicate with those layers, we have to specify which `vpc`, or virtual private cloud, this handler will run within. AWS services are basically islands, and vpcs are a way to enable secure communication between some of the islands under our control. By saying that our handler belongs to a particular vpc, we are telling AWS which services it can communicate with.

API Gateway handlers have a hard timeout of 30 seconds, which we cannot modify or exceed. If your function takes longer than that to run, you'll need to put some of the functionality in non-ApiGateway Lambdas and consume the output in your endpoint/handler.

### Handler code

Turning our attention to `services/app-api/src/handlers/reports.main`, note the return type of the `main` function. An `APIGatewayProxyHandler` type imposes constraints on what we can return; in this case, an HTTP response. The majority of our handlers have this `APIGatewayProxyHandler` type. You can inspect that type definition in your code editor to see other possible return types.

One other handler to examine as a model is `/app-api/handlers/bulk_download.ts`. This code interacts with AWS S3, which is our file storage service. It's quite common to have lambdas that upload, download, delete, or read from an S3 bucket, or that run when one of those events is triggered by another lambda.

## Summary

Creating a new endpoint is fairly complex process that will require planning and collaboration. This doc is intended to orient you to the task and give you some context for terms and decision points, but when in doubt, always talk to your teammates!
