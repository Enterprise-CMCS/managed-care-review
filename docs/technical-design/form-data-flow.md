# Form-data flow

The MC-Review site's primary function is to collect form data from states, and package it for review by CMS. In this document, we'll describe the flow of that form data through the app; from creation to storage, and back from storage to the UI.

## Information entry

```mermaid
graph TD
    A["User enters form data"] -->|"validated by Formik and Yup"| B["Data submit (by clicking 'continue' or 'save as draft')"]
    B -->|"convert data to a base64 protocol buffer<br />(toProtoBuffer)"| C["GraphQL resolver"]
    C -->|"convert data back to  backend domain models for various checks<br />(toDomain)"| D["Prisma (postgres)"]
    D -->|"convert again to protobuf"| E["Written to database"]
```

## Information retrieval

```mermaid
graph TD
    A["User clicks link to a package"] -->B["GraphQL resolver"]
    B --> C["Query Prisma (postgres)"]
    C -->|"data is returned to the resolver for checking" | D["(the same) GraphQL Resolver"]
    D -->|"run various checks"| E["Front-end"]
    E -->|"convert from protocol buffers to Typescript domain models<br />(toDomain)<br />validate with Zod"| F["UI"]
```

### Supplements

For an overview of what the data is like, and why it's being converted to and from protocol buffers, see [the serialization ADR](../architectural-decision-records/008-form-data-serialization.md).

For a more detailed look at what's happening in code when we ask for data, see the [discussion of GraphQL endpoints](creating-endpoints.md#graphql).
