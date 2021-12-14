# 009 — Decide on data serialization approach for submission data

Data for managed care submission forms is central to our application. A pain point in the project has been determining ‘what is a submission’ and how this data should be structured. As we add more and more states to our system, as we continue design and research, and as CMS policy changes we expect our data model will continue to be highly unstable. Knowing this, we will use a data serialization tool to encode our data using a schema that can be stored alongside the data record. The background behind this approach is described in [ADR 008](./008-form-data-serialization.md).

There are a few approaches we could take to encoding our data and creating a schema. This ADR compares two approaches - Google Protobufs and Apache Avro.

### Decision Drivers

-   Good understanding and documentation around how to add complex fields to the schema and handle schema evolution
-   Typescript compatibility (project is Typescript monorepo and types are essential)
-   Availability of tooling and docs for Node/JS/TS ecosystems
-   Ease of usage and setup

## Considered Options

### Google Protobufs

### Apache Avro

## Decision Outcome: Use Protobufs

Use Protobufs. Not having adequate docs, supporting tools for Typescript in Avro is a red flag. The [protobufjs](https://github.com/protobufjs/protobuf.js/) is good library to begin with. It has a clear api, ample documentation, and should integrate well with our existing tooling. We have some experience with protobufs already on the team.

### Pro/Cons

#### Google Protobufs

-   `+` Typescript support built in and well documented, particularly within protobufjs
-   `+` Clear path to compile schema created object to also reference its own types.
-   `+` Schema is written similar to declaring typescript types - declare subtypes for complex objects and then combine to use them - this means adding complex fields to the schema is a bit familiar
-   `+` Certain common changes to fields are trivial, for example changing data value from one value to many in a list (repeated) is straightforward. Same thing with changing the field name (possible because reference passes by field number not name).
-   `-` Protobuf has its own syntax for declaring types - similar to Typescript conceptually, but different enough that there may be a learning curve.
-   `-` We will need to build out some custom functionality for schema comparison and serialization to start using protobufs that come for free with Avro. We will also need to write tests to maintain this boilerplate code.

#### Apache Avro

-   `+` Clear patterns for resolving incompatible schemas (built in methods - createResolver) and clearly defined rules for schema resolution.
-   `+` Schema is more “human readable”.
-   `+` Avro is friendlier to dynamically generated schemas (though not currently relevant for our use case since we don’t plan to type our submission form data blob in the database or anywhere else; we will be writing the schemas by hand)
-   `+` Common use case with self describing files - embed the schema with the data records in a object container fil, Protobufs has third party tools to do this but with Avro its built in.
-   `-` Typescript support is less robust, dependencies to add types are not as available or developed. Also, much less documentation overall in the Node/JS/TS ecosystems.
-   `-` We need to know the reader and writer schema to do any action with serialized data - could introduce complexity - e.g. frontend/backend consumers will always need to know both the current schema and the schema coming with the data it is reading
