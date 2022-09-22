# How to create a new endpoint

There are two ways that we create endpoints in our app. One uses GraphQL, the other creates AWS Lambda handlers.

When we want to fetch or update information relevant to the app itself--think of submissions, or user info--we'll typically use GraphQL.

When we want to communicate with a service like New Relic, download a file, or, for example, to set up a health-check endpoint, we'll use a handler. The relative merits of each approach should become clear below.

## GraphQL

The major mental shift in using GraphQL, in contrast to RESTful services, is that you have to _begin_ by thinking of the data you want returned. With REST, it's common to hit an endpoint, get back a large JSON, browse through it, and then, in the application code, whittle it down, or pluck the bits that you need. But we'll construct our GraphQL queries to return to return exactly what we need, before we hit the application code at all.

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

_**Create a new file: `/app-api/src/postgres/dataExport.ts`**_. We use Prisma to query the database.

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

#### Adding our method to the store

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

We use Apollo Client to interface with our data source and to provide information from the store to the front-end; the methods to do that are called "resolvers".  
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

### Generating code

Once we have our backend code in place, we need to run a couple of commands to generate glue types and methods.

_**On the command line, navigate to `/services/app-graphql`.**_  
_**Run `yarn gqlgen`**_

_**Again on the command line, navigate to `/services/app-api`**_  
_**Run `yarn prisma generate`**_

### Getting data on the front end

One result of the `generate` commands is to create a hook that we can use on the front end to call our new resolver. The name of the hook will be of the form _useWhatYourResolverIsCalledQuery_ (it will end with "Mutation" if that's what you've created). You can pull it in and get data.

```typescript
import { useDataExportQuery } from '../../gen/gqlClient'
const { data, loading, error } = useDataExportQuery()
```

## Lambda

### Serverless configuration

When we create a handler, we're telling serverless to create a new Lambda function for us in AWS. If we configure it correctly, that function will have access to things like our postgres database, which itself is hosted on AWS. Here's one existing handler configuration, found in `/services/app-api/serverless.yml`.

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

`layers` tie this handler to services that it needs. In this case, it needs database access, so there's a Prisma layer, and it's also being tied to `otel`, our open telemetry service, for observability.

In order to communicate with those layers, we have to specify which `vpc`, or virtual private cloud, this handler will run within.

API Gateway handlers have a hard timeout of 30 seconds, which we cannot modify or exceed. If your function takes longer than that to run, you'll need to put some of the functionality in non-ApiGateway Lambdas and consume the output in your endpoint/handler.

### Handler code

Turning our attention to `services/app-api/src/handlers/reports.main`, note the return type of the `main` function. An `APIGatewayProxyHandler` type imposes constraints on what we can return; in this case, an HTTP response. The majority of our handlers have this `APIGatewayProxyHandler` type. You can inspect that type definition in your code editor to see other possible return types.

One other handler to examine as a model is `/app-api/handlers/bulk_download.ts`. This code interacts with AWS S3, which is our file storage service. It's quite common to have lambdas that upload, download, delete, or read from an S3 bucket, or that run when one of those events is triggered by another lambda.

## Summary

Creating a new endpoint is fairly complex process that will require planning and collaboration. This doc is intended to orient you to the task and give you some context for terms and decision points, but when in doubt, always talk to your teammates!
