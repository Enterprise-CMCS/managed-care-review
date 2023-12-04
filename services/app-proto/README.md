# app-proto

This service compiles protobufs, with types, for use as the mc-review state submissions data model. It contains a schema for the submissions data and functions for converting between protobuf and Typescript domain models.

[Protocol buffers](https://developers.google.com/protocol-buffers), also called protobufs, are Google's language-neutral, platform-neutral, extensible mechanism for serializing structured data.

To read about the strategy behind using protobufs for encoding state submission data, see our ADRs on the subject: [Form Data Model Serialization](../../docs/architectural-decision-records/008-form-data-serialization.md) and [Decide on data serialization approach for submission data](../../docs/architectural-decision-records/009-data-serialization-framework.md)

In short: our submission form data is complex nested data that is slowly changing over time, needs to be able to read old versions, and is usually accessed as a single piece in the course of review. Protobuf is a well defined serialization format that gives us type and key name safety along with the ability to read old protos without blowing up. By storing that directly in postgres, we are able to keep all of our form data in one piece. We won't have to maintain migrations for every data model change and saving new versions of the proto is as simple as adding another row to the table.

## Significant dependencies

We use [protobuf.js](https://github.com/protobufjs/protobuf.js) to generate javascript code for reading and writing protobufs based on the schema defined in /src/state_submission.proto

To read about the code we wrote that converts our domain models to and from protobuf, check out the [stateSubmission package](https://github.com/Enterprise-CMCS/managed-care-review/tree/main/services/app-web/src/common-code/proto/healthPlanFormDataProto)
