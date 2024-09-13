# State Submission Form Protobuf

This package exports two functions

`toProtoBuffer(domainData: UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType): Uint8Array`

and

`toDomain(buff: Uint8Array): UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType | Error`

These functions encode and decode our domain submission types to and from protobufs. Our proto schema is located in the [app-proto service](https://github.com/Enterprise-CMCS/managed-care-review/tree/main/services/app-proto) where it is compiled as part of our build process into the /gen package as a pair of js and d.ts files that allow us to read and write conforming protobuf bytes.

The work of this package then is in safely converting our domain UnlockedHealthPlanFormDataType and LockedHealthPlanFormDataType to and from the generated StateSubmissionInfo class that can be encoded and decoded to protobuf. This is not a simple mapping for a few reasons.

1. All fields in proto3 protobufs can be undefined. This is the core rule that allows for protobufs to be backwards compatible, but is a very different from our models where we do in fact require certain fields (like... .id). That's easy when we're converting to protobuf, it's happy to accept non-undefined values, but when converting to our domain models we need to check that all the fields we require are present so that the object we return actually conforms to its type.
    - in toDomain we parse out values from the protobuf into a type of `RecursivePartial<UnlockedHealthPlanFormDataType>`. That type allows any field to be undefined, just like in our protobuf.
    - After we've parsed out every field in the protobuf's layout into our own, then we run a runtime check to validate that all the required fields are present. We return an error if not, but if its valid then we return the correct type
2. The .proto data model is different from the domain models (presently). When writing the .proto file we had a chance to fix some mistakes we made in building our domain models. Eventually these can be reconciled but some of the fields don't match up 1:1 as is, so we parse the protobuf into the domain's shape.
3. Protobuf stores dates as ITimestamps which are a different memory format than js Date classes, so we need to convert them
4. The generated protobuf classes use javascript enums to represent enums, but we use typescript string unions, so we need to convert between those too.

You will see accommodations for each of these issues in both our encoder and decoder.
