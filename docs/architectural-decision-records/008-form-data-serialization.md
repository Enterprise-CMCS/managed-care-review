# 008 — Form Data Model Serialization

Our submissions form model is complicated, not fully standardized, and ever-changing as we continue design and research and bring more states onboard to MC Review. We currently track answers to various questions about state managed care submissions in our DraftSubmission model. This includes top level fields like submission type, description, and contract details, as well as nested or conditional fields like presence of rates, presence of amendments, rate details, and a list of categorized documents.

This entire form data model is represented in the following places in the app

-   Individual form pages - using Formik values (client)
-   GraphQL (api protocol)
-   Domain Models (shared Typescript models used in both client and server)
-   Dynamo Models (database)
    With conversions between each of them in a row.

We know that submission data is almost always handled as a package, particularly in draft form. It is not queried by field. This means that having things be fully normalized in the database is not super important because the data is usually looked at as a package.

Since our form-data model is complex and changing over time, this is not ideal for future maintainability. Forcing the issue, we are moving from dynamo to postgres for a variety of reasons and adding SQL tables to the list of things to maintain makes this even more onerous.

## Considered Options

### Postgres Tables

Given that we are switching to postgres, we will need some way of storing all our form data in that database. The most straightforward way to do that would be to layout all that data in postgres tables. So a submissions table, a contacts table, a documents table, etc. As we add or remove data from the form in the future, we would add to those tables as we need, using migrations to update old submissions to be valid. Those migrations would be another place where our data would need to stay in sync

### Serialize Domain Models with JSON

To save on having to maintain a complex set of relational tables just to store our submission form data, we could instead store a JSON representation of the form in postgres instead. That means that there only needs to be a single table for submissions, even as the form data changes, we can store all of it in a single JSON column. We can write our domain models to JSON and read them in as well. This is maybe the least safe option, because it would be very easy for stored JSON to get out of sync with our domain models.

### Use a data serialization protocol

By using a data serialization approach - specifically storing the data as a binary in our database alongside a schema specific to that record, we have a single source of truth for the structure of the submission data. We will read from the schema both client-side and server-side to reference the structure of the data.

We think this approach is feasible in part because we know that submission data is always handled as a package, particularly in draft form. It is not queried by field.

Our primary goal in using a data serialization tool is to easily understand and reference the structure of the data using a schema and to simplify managing the changing data in the database. A secondary goal is that by using a schema we avoid each layer of the app having the type the changing data structure separately - instead the schema becomes the source of truth for submission data.

## Chosen Solution

Use a dedicated data serialization format to represent form data. Save that serialized format in the database directly, send it through the API directly, and read and write it on the front end. Update the form model by adding optional fields as much as possible. When the form can be unlocked, save a new row in the db with the new version of the form data.

### Pro/Cons

#### Postgres Tables

-   `+` Hard types in the database, things that are required can be required, etc
-   `+` Postgres is already a dependency, so this doesn't require more dependencies
-   `+` Can arbitrarily query form data in the future
-   `-` Separate tables for Draft and State submission would be most correct and onerous
-   `-` Updating all the related tables on every updateDraftSubmission would be somewhat complex, require transactions
-   `-` That gets worse as we try and save update submissions. Now each past version requires rows in multiple different tables
-   `-` Every time we change the form, we have to write a migration that works with all old versions of the form data

#### Serialize Domain Models with JSON

-   `+` No additional dependencies required
-   `+` The domain models become the source of truth, so methods we write for them are useful everywhere
-   `+` JSON is human readable
-   `-` There’s no good migration story. Old serialized data would basically need to be treated as untrusted/untyped data
-   `-` It would make it very hard to change our domain models, as soon as you do pulling stuff out of JSON wont match

#### Use a data serialization protocol

-   `+` A well known format means that we can use established tooling to interact with form data in the future
-   `+` These format accommodate migrating data, handling new fields when decoding old data
-   `+` The format can become the source of truth for the form data, interacted with both by the backend and the frontend
-   `+` We can eliminate the form data model from the graphql api and the database
-   `-` Another dependency for folks to learn
-   `-` Still need to convert to domain models, depending on how we implement this
-   `-` Harder to search arbitrarily in the database b/c not in separate tables
