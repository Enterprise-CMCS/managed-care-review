# 007 — Move to Postgres

As we move beyond our submission MVP, our database needs are becoming more complex. Up until now we’ve only stored a single datatype: the submission form data. The CMS review workflow will require much more relational data, as we track the status of different parts of the submission across three different departments, as well as more firm data integrity guarantees as different people start to handle the same data. These needs have driven us to reevaluate our reliance on DynamoDB just as [we suspected we would](./004-use-dynamodb-for-now.md) back in January. After considering the options, we have decided to move to using postgres as our database, replacing our use of Dynamo.

## Decision Drivers

-   Relational Data Queries
    -   See this [Mermaid Diagram](mermaid) for a possible future for our data model
    -   The relationships between reviewers, Submissions, and Rates are many and will justify several different querying patterns
-   ACID guarantees
    -   CMS Users will need to concurrently edit submissions, we will want to be especially careful about status changes since those will be reported on and ultimately define whether packages are approved for use or not.
    -   Especially because we are using typescript, we want to be sure that data we retrieve from our database will have all the fields we expect
-   Effort to maintain
    -   We’re a small team trying to move quickly, for any technology we adopt we need to take into account the skills we have or will need to maintain it
-   Tooling
    -   Good tooling makes for better products and happier developers
-   Not Scalability
    -   We expect our system to have on the order of 100 users per year, scalability is not a major decision driver for us.

## Considered Options

### Keep DynamoDB

Dynamo is a document database, a type of database that has become popular in recent years. This talk from an amazon architect starts with a nice history of databases and the particular pressures that drove their migration from relational dbs to dynamo, specifically that overwhelming request load started to make it impossible to maintain SQL databases. Dynamo inverts the traditional paradigm and focuses on making reads as fast as possible whereas SQL databases focused on writing data being always consistent and quick.

To continue using DynamoDB, we would try and constrain our data to a single table, likely with rates existing on fields to submissions, and then make indices to allow querying different parts of that data in different ways.

### Move to a relational db

Postgres is an oldie but a goodie. It’s been my SQL DB of choice for my entire career. Switching to it will require that we figure out how to store our submission data in blobs in the table b/c it will be more trouble than it’s worth to break all that data out into tables. We will then be able to model the CMS workflow process very carefully in separate tables with separate statues for each review. We architected our db access into its own package on the backend from the start so we will need to swap out postgres for Dynamo there

## Chosen Decision: Move to Postgres

Our service is never going to generate the traffic that really shows the main benefits of DynamoDB but the tradeoffs Dynamo accepts to handle that traffic will really affect us. Postgres will allow us to model our data and the relationships between them naturally, enforcing constraints and building useful queries. Aurora will allow us to connect safely to postgres from lambda and we’ll store form data as blobs to save on complexity.

### Pro/Cons

#### Postgres

-   `+` Relational data can be stored normalized, queried arbitrarily
-   `+` Database schema is enforced, you can rely on the shape of the data being returned.
-   `+` Postgres can query inside JSON columns, so if we store form data that way we can still query it for reporting purposes
-   `+` Prisma is a good tool for interop between Typescript and Postgres
-   `+` Postgres is an old tool that we are all familiar with
-   `-` We have to manually provision a VPC, which we unfortunately can’t do from code for some reason (CMS doesn't give us access)
-   `-` We need to build a migration system b/c tables have to be defined in advance

#### Dynamo

-   `+` It is already in our environment
-   `+` It is very easy to use from Lambdas
-   `+` Doesn't need a VPC
-   `+` Easy to trigger lambdas based on row updates
-   `+` It’s what the rest of MacPro is using already
-   `-` Schemaless, so no guarantees on data shape and correctness
-   `-` dynamo-data-mapper is ok, not great, hasn't been updated in years.
-   `-` Relations between data is not easily modeled (no joins, foreign keys, etc)
-   `-` Very weak querying model, access patterns need to be known up front (no ad-hoc querying)
-   `-` Transactions are limited, you can’t read and write in the same transaction so for common use cases you instead need to use test-and-set primitives
-   `-` Data model changes are very difficult to do, must be handled from the API
-   `-` DynamoDB is a new tool that none of the team are very familiar with

[mermaid]: https://mermaid-js.github.io/mermaid-live-editor/edit/##eyJjb2RlIjoiZXJEaWFncmFtXG5TVEFURSB7XG4gICAgc3RyaW5nIGNvZGVcbiAgICBzdHJpbmcgbmFtZVxufVNUQVRFfHwtLXx7IFBST0dSQU0gOiBoYXNcblxuUFJPR1JBTSB9fC0tfHsgQ09OVFJBQ1RfUkVWSUVXIDogXCJtYW55IHRvIG1hbnlcIlxuICAgIFxuUFJPR1JBTSB7XG4gICAgc3RyaW5nIGlkXG4gICAgZW51bSBzdGF0ZUNvZGVcbiAgICBzdHJpbmcgbmFtXG59XG5cbkNPTlRSQUNUX1JFVklFVyB7XG4gICAgc3RyaW5nIGlkXG4gICAgZW51bSBzdGF0dXNcbiAgICBudW1iZXIgc3RhdGVOdW1iZXJcbiAgICBlbnVtIHN0YXRlQ29kZVxuICAgIGRhdGUgbGFzdFN1Ym1pdHRlZEF0XG4gICAgZGF0ZSBjcmVhdGVkQXRcbiAgICBkYXRlIHVwZGF0ZWRBdFxuICAgIGZrZXkgcHJpbWFyeURNQ09SZXZpZXdlclxuICAgIGZrZXkgc2Vjb25kYXJ5RE1DT1Jldmlld2VyXG59XG5cbkNPTlRSQUNUX1NVQk1JU1NJT04ge1xuICAgIHN0cmluZyBpZFxuICAgIGZrZXkgY29udHJhY3RSZXZpZXdJRFxuICAgIGRhdGUgc3VibWl0dGVkQXRcbiAgICBkYXRlIGNyZWF0ZWRBdFxuICAgIGRhdGUgdXBkYXRlZEF0XG4gICAgYmluYXJ5IGNvbnRyYWN0RGF0YVxufVxuXG5DT05UUkFDVF9SRVZJRVcgfHwtLXx7IENPTlRSQUNUX1NVQk1JU1NJT046IFwiaGFzIG1hbnlcIlxuXG5SQVRFX1JFVklFVyB8fC0tfHsgUkFURV9TVUJNSVNTSU9OOiBcImhhcyBtYW55XCJcblxuQ09OVFJBQ1RfUkVWSUVXIHx8LS18byBSQVRFX1JFVklFVzogXCJoYXMgbWFueVwiXG5cbkNPTlRSQUNUX1NVQk1JU1NJT04gfHwtLXxvIFJBVEVfU1VCTUlTU0lPTjogXCJoYXMgbWFueVwiXG5cblJBVEVfUkVWSUVXIHtcbiAgICBzdHJpbmcgaWRcbiAgICBzdHJpbmcgY29udHJhY3RSZXZpZXdJRFxuICAgIGVudW0gc3RhdHVzXG4gICAgZmtleSBwcmltYXJ5RE1DUFJldmlld2VyXG4gICAgZmtleSBzZWNvbmRhcnlETUNQUmV2aWV3ZXJcbiAgICBma2V5IHByaW1hcnlPQUNUUmV2aXdlclxuICAgIGZrZXkgc2Vjb25kYXJ5T0FDVFJldmlld2VyXG59XG5cblJBVEVfU1VCTUlTU0lPTiB7XG4gICAgc3RyaW5nIGlkXG4gICAgZmtleSByYXRlUmV2aWV3SURcbiAgICBma2V5IGNvbnRyYWN0U3VibWlzc2lvbklEXG4gICAgYmluYXJ5IHJhdGVEYXRhXG59XG5cbkNPTlRSQUNUX1JFVklFVyB9fC0tfHsgUkVWSUVXRVI6IFwibWFueSB0byBtYW55XCJcblxuUkFURV9SRVZJRVcgfXwtLXx7IFJFVklFV0VSOiBcIm1hbnkgdG8gbWFueVwiXG5cblJFVklFV0VSIHtcbiAgICBzdHJpbmcgZXVhXG4gICAgc3RyaW5nIG5hbWVcbiAgICBlbnVtIGRlcGFydG1lbnRcbn1cbiIsIm1lcm1haWQiOiJ7XG4gIFwidGhlbWVcIjogXCJkZWZhdWx0XCJcbn0iLCJ1cGRhdGVFZGl0b3IiOmZhbHNlLCJhdXRvU3luYyI6ZmFsc2UsInVwZGF0ZURpYWdyYW0iOnRydWV9
