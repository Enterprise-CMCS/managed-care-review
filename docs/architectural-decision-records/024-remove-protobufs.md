---
title: Remove protocol buffers from the application

---
## ADR 0024 — Remove protocol buffers from the application

- Status: Proposed
- Date: 5/23/2023

This ADR overrides our previous decision from [ADR 009](./009-data-serialization-framework.md) to handle serialized data in the application via protocol buffers. 

## Decision Drivers
- The reason protobuf was introduced to the application was for data storage reasons. We no longer have that technical requirement and plan to remove protobuf from our postgres tables (see [ADR 023](./023-seperate-contract-rates-tables-postgres)). 
- Protocol buffers have some associated tooling in the application we need to maintain as long as this format is in use. This is tech maintenance load. 
- Eng team feels the protocol buffer tooling and documentation is immature and creates a mental load for developers. å

## Constraints

This ADR is concerned with where we see the usage of protocol buffers (and associated dependencies) in the application going forward. A separate ADR is merited here because engineering team could readily ship the work related to ADR 023 and still leave protobufs lingering in our data transport and frontend after the migration.

## Considered Options

### Option 1 No change. Keep protocol buffers in the application after database migration

This entails no change to the current health plan form data APIs. We continue to maintain `toDomain` and `toProtocolBuffer` when form fields change and we keep protobuf dependencies up to date. 

### Option 2 Remove protocol buffers from the application

This entails a second wave of focused refactors to rewrite existing health plan APIs and frontend components. We move towards data fields directly from API instead of handling serialized health plan form data.

## Chosen Solution: Remove protocol buffers from  the application 

### Pros and Cons of the Alternatives
​
#### Option 1 No change 
​
- `+` Familiar.
- `±` Simplicity of the backend, we don't need to break out all the contract data into it's own API or graphql schema if it's not needed.
- `-` We keep an unnecessary schema in the application (`.proto` file) that has no type safety or guarantees 
- `-` Complexity on frontend and in the API.  We maintain two types of APIs in the application - new APIs (fetchRate, indexRates) will not use this format, old APIs will. Frontend components similarly will have data serialization steps in some cases, and not in others.
- `-` We still need to stay up to date with changes to proto spec and dependencies 


#### Option 2 Remove protocol buffers from the application entirely

- `+` We unify around one approach to health plan data APIs
- `+` We no longer maintain protobuf dependencies or tooling, both on the frontend and the backend.
- `+` We remove an entire class of errors in the application related to failed deserialization and type checking for protos
- `±` We write new contract health plan apis and connect into our state submission form 
- `-` We have to rewrite how health plan data is handled in the API and the frontend
- `-` We invest significant eng time in a refactor 