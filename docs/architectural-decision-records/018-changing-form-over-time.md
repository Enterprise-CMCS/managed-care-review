# ADR: The Form Changes Over Time

## This ADR is deprecated as we removed Protobufs and the HealthPlanPackage type from the codebase. There is not a superseding ADR on form changing over time. Leaving this ADR here for historical context.

## Background

The heart of MC Review is the Health Plan Package Form, wherein a state files the contract and rate documents and answers a series of questions all in one place for review by the CMS teams. The app asks all these questions of the states, and then after submission displays the answers to CMS. These questions are not frozen in time, what is relevant to a good review will change over the years, we saw that first hand with respect to COVID 19; when we showed up we asked a question about whether this submission was related to COVID, now that's no longer a useful question to ask so we stripped it from the form. 

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
}
```

You can see that each field has a type, and those types can include enums or other proto messages. You will also see that everything is optional, that is protobuf's solution to evolving schemas, any field you ask for might be missing so you have to prepare for that. You will see that we have adopted a similar scheme for managing our changing data throughout the app. 

## Decision Made

We will store form data in the the db in the format it was originally submitted in. As the set of questions of the form changes, we will retain the ability to display old submissions on the summary page, even when they have a different set of questions from the current form. To facilitate that, we will attempt to only change the form data schema by adding optional fields to it or making any removed fields optional. If we must change the type of a field, we will remove it and add a new field with the correct type. This will let us build our summary page to simply omit questions that are not present in whatever version of the form data being displayed. We will not need to version our form datatype or our UIs by doing this, but it does not close the door to that option in the future if we need to. When someone unlocks and edits an out-of-date submission, we will migrate the data to the latest schema, forcing them to answer any missing questions before re-submitting. 

## Options Considered

### Data Storage

The first question we have to answer about changing form data is whether we want to maintain old form data with the same schema as they were submitted, or just migrate the data as the form changes. 

#### Keep Old Submissions Intact

This strategy preserves all the data we received for each package as it was when submitted. We store the data in the format it was entered in in the database and display it as it was whenever someone accesses it. 

#### Migrate Submission Data

This strategy would migrate old data as the shape of our form changes. If we removed a question, it would be removed from old submissions. If we add a question, a dummy answer would be added to the old submissions. This would mean that our code would only ever have to deal with the most recent version of the data, every time a submission was loaded, no matter how old, the data would come back in the same shape. 

The drawback, and ultimately the deal breaker, is that we would then lose some actual answers submitted by states in the past. We decided that it was crucial to keep a complete record of what a state submitted in the past regardless of how the form has changed since. Reviews of these contracts take place on a timeline of years, we don't want to lose the record of what was submitted since that might be referenced over time in the adjudication of the submission. 


### Schema Migration

Since we want to keep old data intact and we need to be able to change the schema of the data over time, that means that our application will need to be able to deal with loading different schemas of data if it is viewing a recent or an old version of the form. 

There are a variety of different changes to the form that will require changing the shape of our data. Two simple ones are adding a new field or removing an old one. More complex ones could be changing the type of a field or changing the values of an enum. We identified two broad strategies for dealing with this, one more invasive than the other. 

#### Only Add/Remove Optional Fields

First we can simply always add optional fields and only remove optional fields. By that I mean optional at the typescript field level. This forces our code that deals with the form data to always check on the existence of these fields and deal appropriately with the case where the data is missing. Since this mostly concerns the single page where we display the package summary, it's really a question of leaving question/answers off the page when they don't exist in the data. This works in both directions. Displaying an old submission that doesn't have one of the new questions on it, omit it. Displaying a new submission that doesn't have a question that has been removed, omit it. If a field's type needs to change, that can be accommodated by adding a new field and removing the old one. 

One drawback to this is that our summary page has to be able to display every single question ever asked on the form. As the form changes, our summary page will grow continuously, and in a kind of patchwork where different submissions across time will display different subsets of all the questions. We can mitigate this by building tests around rendering the summary for old submissions. 

Another drawback is that our datatype will no longer enforce the completeness of a package at submission time. We can still validate completeness at the moment of submission, but afterwards, loading a submission, we will get what we get and there will be no guarantee that we have all the fields that are currently required. 

#### Version The Form Datatype

The other strategy is to version the data. After a change to the form, we can create a new datatype, "FormDataV2" that has the correct fields. Our pages that deal with the form data can then be customized for the new type. We'd likely have a SummaryPageV1 component and a SummaryPageV2 component. They would share a lot of sub-components but would only display the data for a single version of the form. And we could continue to use non-optional fields to statically enforce the completeness of the form. A required field can be depended upon to exist in the FormData object.

The main drawback to this strategy is that it introduces a lot of overhead to form changes. The more the form changes, the more versions we have to track, bloating our data types and the code that has to deal with them. 

The nice thing about these two strategies is that they are complimentary. We have decided to start by just adding optional fields to the existing FormData type. Our summary page will be able to display old versions of the data simply by omitting questions for any optional fields not present. If at some point the accumulation of old questions on that page become too onerous to maintain, or if we need to drastically change the shape of the form data, we can version the data then, making a clean brake.  

### Data Display

Finally we come to the details of how we want to display different versions of this data. There were design questions and technical questions we considered. 

In line with our desire to maintain the complete record of past submissions, it makes sense for us to attempt to display the summary of an old submission in the same state as it was originally submitted. Rather than displaying questions with blank answers, we want to just omit questions and answers all together when a submission is missing a field. This makes an old submission missing a new question appear the same way it did when originally submitted, rather than appearing like it's missing something expected. 

#### Omit missing fields

This option pairs nicely with the "only add optional fields" strategy we're pursuing. There will be one version of the submission summary page and it will read and display our current datatype. Any fields that have been added since our initial version will be optional, so we can omit any question and answers from the page that don't exist in a given submission. 

#### Version the UI

This option pairs well with versioning the data. We can freeze a given UI in time and pass a datatype that matches that version to it when we pull an old submission down. This preserves the display of the summary exactly as it was back then. It's possible that if we make structural changes to the summary page though, it will look odd to display an old version of the UI just because we are viewing an old submission. 

### On Updating Old Data

We also discussed what to do when someone edits a submission that has become out of date. 

#### Edit using the old schema, requires versioned form UI and versioned schemas

Allow a user to re-submit using the same questions that they answered the first time they submitted the form. This would require us maintaining a version of the form inputs that matches old versions of the form. It would preserve all the questions asked at the original time of submission, even if the edits came years later. Having to figure out what questions to ask and validate for each old version of the form could get complex very quickly. 

#### Edit using the new schema and adding form level validations to review and submit page

When someone edits an out of date submission, the submission will be migrated to the new schema. This means that our form entry UI does not need to be aware of past versions, and it means that we expect states to answer new questions if they go back in to edit an old submission, bringing it up to date in the process. Since unlocked submissions default to the review and submit page, we would no longer be able to assume that all submissions are complete upon reaching that page. We would need to add validation logic to the review and submit page forcing folks to go back to any page that has a new question that needs answering. 

