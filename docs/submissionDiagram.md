# Submission Data Model

Diagrams are drawn using [Mermaid](https://mermaid-js.github.io/mermaid/#/entityRelationshipDiagram) to better visualize the in the app. You can edit and save new diagrams using the [Mermaid Live Editor](https://mermaid-js.github.io/mermaid-live-editor).

## Database Models (birds-eye view)

For more detail, see [prisma schema](../services/app-api/prisma/schema.prisma).

```mermaid
erDiagram;

StateSubmission ||--|{ StateSubmissionRevision: "contains many"
StateSubmission ||--|| State: "assigned to"
```

## Domain Models (detailed representation of data and relationships)

For more detail, see [graphql schema](../services/app-graphql/src/schema.graphl) and the submission form data [proto schema](../services/app-proto/src/state_submission.proto)

Other notes:
- Programs are currently hardcoded in a [file](../services/app-api/data/statePrograms.json)
- "Health plan package" and "state submission" mean the same thing.
  
```mermaid
HealthPlanPackage {
    date initiallySubmittedAt
    enum status
    string stateCode
    array revisions
}
HealthPlanPackage ||--|| HealthPlanPackageRevision: contains

HealthPlanPackageRevision {
    date createdAt
}

HealthPlanPackageRevision ||--|| HealthPlanPackageFormData: contains
HealthPlanPackageRevision ||--|| SubmitInfo : contains
SubmitInfo {
  date updatedAt
  string updatedBy
  string updatedReason
}

HealthPlanPackageRevision ||--|| UnlockInfo : contains
UnlockInfo {
  date updatedAt
  string updatedBy
  string updatedReason
}

HealthPlanPackageFormData {
    string id
    string status
    number stateNumber
    enum stateCode
    string submissionDescription
    enum submissionType
    array programIDs
    enum contractType
    enum contractExecutionStatus
    date contractDateStart
    date contractDateEnd
    array managedCareEntities
    array federalAuthorities
    enum rateType
    date rateDateStart
    date rateDateEnd
    date rateDateCertified
    date submittedAt
    date createdAt
    date updatedAt
    object rateAmendmentInfo
    object contractAmendmentInfo
    array stateContacts
    array documents
}

HealthPlanPackageFormData ||--|{ Document : contains
    Document {
        string name
        string S3URL
        array documentCategories

    }


HealthPlanPackageFormData ||--|{ Contact : contains
    Contact {
        string name
        string titleRole
        string email
    }

HealthPlanPackageFormData ||--|| ContractAmendmentInfo : contains
   ContractAmendmentInfo {
      array itemsBeingAmended
      string otherItemBeingAmended
      boolean relatedToCovid19
      boolean relatedToVaccination
    }

 ContractAmendmentInfo ||--|| CapitationRatesAmendedInfo : contains
   CapitationRatesAmendedInfo {
      string reason
      string otherReason
    }


HealthPlanPackageFormData ||--|{ RateAmendmentInfo : contains
   RateAmendmentInfo {
      date effectiveDateStart
       date effectiveDateEnd
    }
```
