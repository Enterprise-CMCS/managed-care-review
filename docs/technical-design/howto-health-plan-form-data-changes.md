# How to handle changes in the Health Plan Form Data protocol buffer

## Summary

| Data Layer     | Adding a field | Removing a field | Changing the type of a field |
| ----------- | ----------- | ----------- | ----------- |
| Protocol Buffers    |  Go for it!   | Go for it! However, deprecate, don't destroy | Go for it! Test for data loss.
| Domain Models   | Required field? If so, handle fallbacks for old data and test for data loss      | Go for it! | Handle fallbacks for old data and test for data loss

## Further discussion

### Protobufs

Relevant filepath: health_plan_form_data.proto

Many changes to the protobuf schema itself are straightforward because protos are flexible, have unique field numbers, and use optional field. This means that adding a field or deprecating a field does not effect the ability of proto decoding. If a newer schema is used to read data written with an older schema, the proto decoder drops fields that are no longer in the schema. It also will not error for fields that are present in new schema but missing from old data (they ar just assigned to undefined or empty list).

Changing the data *type* of a field in the schema is also possible, but there is a risk that new values lose precision or is truncated. For example, integer types which and changing from an arrays of fields to a single field (the `repeated` marker) will preserve only the X item in the list.

Types of changes that will be breaking to the protobuf layer and require special handling are fundamental changes the structure of the proto (e.g. moving fields and expecting new field to have default values from older fields) and errors in the saved data itself. Similar to working in a regular database, these types of issues require some type of data migration or versioning to address to fix the data either in storage or on read.

### `toDomain`  (which also calls `toLatestVersion`)

Relevant filepaths:

This is a key data transformation layer in our application, where from serialized protobuf into our typescript domain models. We handle errors for invalid protos here and also parse protos to types that match our domain models.

Unlike protobuf spec, the typescript domain model types are rigid. They have required fields and are typed based on the field string name coming back from the proto. This means when adding required fields or changing the type of fields, `toDomain` will need to handle fallback values for fields that may be missing or invalid on older protos.

One way to handle logic for fallback values is to use the schema version and `toLatestVersion` (which is called in `toDomain`). In this step, protobuf data is transformed to match the latest proto schema on read. Then, the rest of `toDomain` is concerned with converting the data from the known schema (the most current) to the domain model.
