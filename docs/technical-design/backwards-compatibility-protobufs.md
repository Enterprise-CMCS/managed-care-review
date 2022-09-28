# Technical Design: Define approach to backwards compatibility with health plan form data

## Overview

We store key data (the health plan package form) for the MC-Review application in a binary protobuf. The reasons for this are described in ADR [008](../architectural-decision-records/008-form-data-serialization.md) and [009](../architectural-decision-records/009-data-serialization-framework.md). A current pain point is how to handle reading from outdated protobuf data throughout the application. Sometimes we will want to change the shape of data stored in the protobuf, and sometimes we will discover errors in that data.  We need an approach for each situation. The protobuf needs to change both its own schema as well as its data.


## Constraints

- Focused on backwards compatibility of form data in the current implementation - via protobuf and domain model layer. 
- Do not not explore alternative solutions to protobufs as a way to store form data
- Do not explore how to handle changing form data in frontend UI


## Definition of Terms


### Google Protobufs/ Protocol Buffer 101

Protocol buffers are Google's language-neutral, platform-neutral, extensible mechanism for serializing structured data. They use the \`.proto\`  extension and have a clearly defined [spec](https://developers.google.com/protocol-buffers/docs/proto3). 

### Form Data Domain Models

Because MC-Review is a typescript application, we must maintain a typescript representation  of the data in the protobuf as well. There are currently LockedHealthPlanFormData and UnlockedHealthPlanFormData. We have shared serialize/deserialize functions that are used both on the frontend and backend to translate back and forth from protobuf to domain model. 

### Data Migration Pattern

This is a method of changing records in the database in a controlled way, such as when the shape of the data in the records changes. It requires implementation both locally and in CI. Generally speaking, each migration creates a new record in the database with a clear timestamp. 

### Schema Versioning Pattern

A protobuf schema defines the shape of its data. Schemas can be versioned, with a specific number, which provides a way to track different changes to the data. This allows the application to know the shape of the data being read and to transform at runtime.

## Background

One principle of predictable, understandable app engineering is that the database should be the source of truth for the information it contains.  At any given moment, we should be able to query the database, get information out, and be confident that that information is correct and valid.

Protocol buffers complicate this story because although they have a schema, it is very loosely typed (all optional types) compared to the rest of the MC-Review domain.The data is also encoded and must be decoded first outside the database to verify its correctness. The "truth" of the data and its shape is in the combination of the stored, encoded data, and the code used to decode it.  In the simplest case, we retrieve the data, decode it, and use it directly.

Most apps will do more than that with the data.  They might reformat dates for display (maybe 24-hour time here, just a calendar date there), or perhaps group some of the information together based on the app's requirements.  

These are all documented and expected uses of protocol buffers and how to decode and use them.  But, as we've discovered, it's also possible for the data in the protobuf to be, simply, wrong.  It could be a wrong date, or wrong name, or it could be, as we've also discovered, a systematic error in every record in the database.

## Examples

Migration pattern - Error in data: Dates stored inconsistently [MR-860](https://qmacbis.atlassian.net/browse/MR-860). 

Versioning pattern - Change to shape of the data: Multi-rate submission [MR-140](https://qmacbis.atlassian.net/browse/MR-140).

## Proposed Solution

A two-pronged approach, depending on the changes to be made.

### For permanent changes to handle errors in the protobuf data:

Do a migration and change the data permanently in the protobuf, and then write back the changed buffer to the database.

Use cases when we will employ a data migration include the following: 

- Populating previously null records with historic data that should have been present 
- Fixing an field value that was improperly assigned (e.g. we find out later we set up a new state with the wrong set of programs but a submission was already entered into the system)


### For changes to the shape of the protobuf data, or the protobuf data types:

Handle those by versioning the protobuf schema and writing translation functions to be run whenever the data is read from the protobuf.

Use cases when we will employ a schema versioning approach include the following: 

- Adding a new form field to outdated submissions with some default value 
- Changing a field from a single value to a list (array) of those values
- Converting the data type for how the same value is stored such as changing a string to enum 

**Why are you picking this solution?**

We might think that we can handle this solely at the decoding step (the schema versioning pattern).  We're already reformatting the data, so why not fix the errors at the same time?  But here's an analogy: imagine a box of legos and instructions for assembly.  We take out the legos, and use the instructions to assemble them, and then we can, if we want, move some pieces around to make something a little different.  But those would still be the same legos.  What we wouldn't do is chop up the legos, or paint them a different color, and then hope that we could undo those changes before we put them back in the box.  

Similarly, with data stored as a protobuf, reformatting and regrouping are supported and documented, but changing the stored value of the field itself, is not how protocol buffers are intended to be used. When we have errors in the data stored itself, trying to handle that solely at decoding would add significant technical risk and complexity. This is why a data migration approach is also needed.

**What are the limits of the proposed solution?**

As long as we stick with using protocol buffers to store form data, this solution is really the only one available to us.  Effectively, we’re committed to using the best tool for the job: versioning when there’s a change easily supported by protobuf and use data migrations when it’s something more major.  The only other option would be to abandon protobufs and move to storing our form data directly in postgres tables, but that’s a major rewrite of the database that effects the entire architecture (api, frontend and types)  that we’re not contemplating in this design document.

**At what point will the design cease to be a viable solution?**

- If we can’t estimate database related work reliably (let’s say we think things will take a sprint and they take over a month again), this design is not a viable solution. 
- If the majority of engineers on the team lack confidence in these patterns and avoid working in this area of the codebase even with more documentation and support, it is not a viable solution.
- If we have multiple failed code releases due to a db change following these patterns, it is not a viable solution.
- If we find we spend more time maintaining this code than the current team size can support (while still delivering sprint work), it is not a viable solution.

**How will you measure the success of your solution?**

Changes to the protobuf schema and data should be relatively simple stories.  If, say, the third data change we do via data migration  is still being estimated at something more than 3 points, our method will require reconsideration. 

## Implementation

**Can this be broken down into multiple technical efforts?**

Yes. There are two significant technical efforts - to build and validate data migration tooling and the same for a schema versioning + data translation layer.  Each of these would be an standalone epic, with efforts around testing and validating the form changes work as expected in both local environments and in deployed env.

**What is the tech stack involved?**

Data Migrations

- New standalone node scripts
- New testing lib and approach 
- Postgres database work to create new proto migrations table
- Serverless work  to set up migrations to run as expected in AWS env with lambdas
- Github actions workflow changes needed for CI changes
- Possible tsconfig or webpack changes needed to run script

Schema Versioning

- New utility called by [toLatestVersion](https://gist.github.com/haworku/15b4e47489eb38c016f1a62381005ac9) that runs within toDomain
- New testing lib and approach  (may or may not be shared with data migrations, more exploration needed)
- app-web and app-api changes to handle error handling from the new utility

**Will additional infrastructure be needed to achieve this?**

Data migrations - yes

Schema versioning- no

**How will you test this?**

 Data migrations pattern

- Unit tests- We have already built a version that requires us committing old versions of proto serialized data and testing that things change as expected. We have this working across deployed environments. Next steps would be making the testing more robust, figure out how to maintain useful proto mocks. 
- End to end (right now this is manual qa in review apps) - we use review apps built with old versions of the data, and then merge on the migration to check manually if CSV versions of the data change as expected.
- Test  in Prod - with migrations we have the ability to clearly roll back data to prior the migration -  if we see an error after merging to prod because we take a database snapshot immediately before we merge a migration

Schema versioning pattern

- Unit tests - need to be built, likely could copy a lot of data migration approach.
- Next steps would be writing tests and tooling for tests
- End to end (right now this is manual qa in review apps) - we use review apps built with old versions of the data, and then merge on the migration to check manually if CSV versions of the data change as expected 
- Testing in Prod - Data translation happens on read  (and then could be written back into the data if new submissions are created or updated). If there is a bug introduced and we store bad data (a user opens a submission, which translates the data, then edits it, which would save this data back to db) we would have to use a data migration to address it.


## Trade-offs

- \- \`+\` We intentionally use the tool best suited to the type of data change. Specifically, we also avoid changing the database programmatically when it is not needed by having a schema versioning option for cases where that would be adequate. 
- \- \`+\` We gain the ability to both change data at runtime and in the database. This makes us more adaptable to form data changes in the future.
- \- \`-\` We maintain double the tooling (for both data migrations and schema versioning) which is higher cognitive load. 
- \- \`-/+\` Depending on implementation, we could be doing duplicate work and maintenance  as both approaches will need their own testing approach. However, there is the possibility to share testing utilities between, for example if we start maintaining shared copies of old protos on production. 


## **Further Reading**

- Difficulties with protobufs and type systems

  - <https://reasonablypolymorphic.com/blog/protos-are-wrong/index.html> 

- Data Migrations approach

  - Team was influenced by [prisma migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate) works. 
  - [Miro diagram](https://miro.com/app/board/o9J_lS5oLDk=/?moveToWidget=3458764530186301817&cot=14) from initial planning

- Schema evolution and versioning

  - Here is a [gist](https://gist.github.com/haworku/15b4e47489eb38c016f1a62381005ac9)that adds more detail about the schema versioning approach 
  - [Schema evolution is not complex](https://medium.com/data-rocks/schema-evolution-is-not-that-complex-b7cf7eb567ac)
  - O’Reilly Designing Data Intensive Applications chapter on [Evolution and Encoding](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/ch04.html#:~:text=With%20Avro%2C%20forward%20compatibility%20means,an%20old%20version%20as%20writer) discusses protobufs, avro and approaches to backwards/forwards compatibility.
  - [How existing schema registries handle versioning and schema evolution](https://docs.confluent.io/platform/current/schema-registry)
