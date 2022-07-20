# ADR: The Form Changes Over Time

## Background

The heart of MC Review is the Health Plan Package Form, wherein a state files the contract and rate documents along with metadata all in one place for review by the CMS teams. The app asks all these questions of a state user, and then after submission displays those answers to CMS. The questions in the form have been carefully chosen in consultation with CMS to save reviewers time without making the process onerous for states. These questions cannot be frozen in time, over time what is relevant to a good review will change, we saw that first hand with respect to COVID 19; when we showed up we asked a question about whether this submission was related to COVID, now that's no longer a useful question to ask. 

As the form changes, this means that the the form summary page will have to be able to accommodate both new submissions that have the latest questions and answers as well as old submissions that were filled out with a different set. This has implications in how we store the form data, how we update the schema over time, and how we display old data.

For reasons described in [ADR 008: Form Data Serialization](./008-form-data-serialization.md) we have chosen to store form data in a blob in a single column in our postgres db. [ADR 009: Data Serialization Framework](./009-data-serialization-framework.md) covers why we chose that blob to be a protobuf. So all the questions in our form have answers in a data blob structured with proto types. Here is a sample:

```
enum SubmissionStatus{
  SUBMISSION_STATUS_UNSPECIFIED = 0; 
  SUBMISSION_STATUS_DRAFT = 1; 
  SUBMISSION_STATUS_SUBMITTED = 2;
}

message HealthPlanFormData {
  optional string proto_name = 1;
  optional int32 proto_version = 2;
  optional string id = 3;
  optional string status = 4;
  optional Date created_at = 5;
  optional google.protobuf.Timestamp updated_at = 6;
  optional google.protobuf.Timestamp submitted_at = 7;
  optional SubmissionStatus submission_status = 8;
  optional StateCode state_code = 9;
  optional int32 state_number = 10;
  repeated string program_ids = 11;
  optional SubmissionType submission_type = 12;
  optional string submission_description = 13;
  repeated Contact state_contacts = 14;
  optional ContractInfo contract_info = 15;
  repeated Document documents = 16;

  repeated RateInfo rate_infos = 50;
}
```

You can see that each field has a type, and those types can include enums or other proto messages. You will also see that everything is optional, that is Protobuf's solution to evolving schemas, any field you ask for might be missing so you have to prepare for that. You will see that we have adopted a similar scheme for managing our changing data throughout the app. 

## Options Considered

### Schema Migration

There are a variety of different changes to the form that will require changing the shape of our data. Two simple ones are adding a new field or removing an old one. More complex ones could be changing the type of a field or changing the values of an enum. We identified two broad strategies for dealing with this, one more invasive than the other. 

First we can simply always add optional fields and only remove optional fields. By that I mean optional at the typescript field level. This forces our code that deals with the form data to always check on these fields and deal appropriately with the case where the data is missing. Since this mostly concerns the single page where we display the package summary, it's mostly a question of leaving question/answers off the page when they don't exist in the data. This works in both directions. Displaying an old submission that doesn't have one of the new questions on it, omit it. Displaying a new submission that doesn't have a question that has been removed, omit it. 

The drawback to this is that our summary page has to be able to display every single question ever asked on the form. As the form changes, our summary page will grow continuously, and in a kind of patchwork where different submissions across time will display different subsets of all the questions. We can mitigate this by building tests around rendering the summary for old submissions. 

The other strategy is to version the data. If another 


### Data Storage



-- data storage
* migrate data over time
* keep old submissions intact

-- schema migration
* add/remove new fields one at a time
* version the data 

-- data display 
* freeze the old UI in place to display old submissions
* add logic to the summary page to display all the fields in a given submission, omitting missing fields. 


## How we did it


