# Submission Data Model

Diagrams are drawn using [Mermaid](https://mermaid-js.github.io/mermaid/#/entityRelationshipDiagram) to better visualize the in the app. You can edit and save new diagrams using the [Mermaid Live Editor](https://mermaid-js.github.io/mermaid-live-editor).

## Database Models (birds-eye view)

For more detail, see [prisma schema](../services/app-api/prisma/schema.prisma).

```mermaid
erDiagram

StateSubmission ||--|{ StateSubmissionRevision: "contains many"
StateSubmission ||--|| State: "assigned to"
```

## Domain Models (detailed representation of data and relationships)

For more detail, see [graphql schema](../services/app-graphql/src/schema.graphl) and the submission form data [proto schema](../services/app-proto/src/state_submission.proto)

Other notes:
- Programs are currently hardcoded in a [file](../services/app-api/data/statePrograms.json)
- "Health plan package" and "state submission" mean the same thing.
  
```mermaid
erDiagram
HealthPlanPackage {
    date initiallySubmittedAt
    enum status
    string stateCode
    array revisions
}
HealthPlanPackage ||--|| HealthPlanPackageRevision: revisions

HealthPlanPackageRevision {
    date createdAt
    UpdateInfo unlockInfo
    UpdateInfo submitInfo
    FormData submissionFormProto
}

HealthPlanPackageRevision ||--|| HealthPlanPackageFormData: submissionFormProto

HealthPlanPackageRevision ||--|| UpdateInfo : "submitInfo"
HealthPlanPackageRevision ||--|| UpdateInfo : "unlockInfo"
UpdateInfo {
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
    date submittedAt
    date createdAt
    date updatedAt
    array stateContacts
    array documents
    ContractInfo  contractInfo
    RateInfo rateInfo
}

HealthPlanPackageFormData || -- || ContractInfo : contractInfo
ContractInfo {
    enum contractType
    enum contractExecutionStatus
    date contractDateStart
    date contractDateEnd
    array managedCareEntities
    array federalAuthorities
    array contractDocuments
    ContractAmendmentInfo contractAmendmentInfo
}

ContractInfo ||--|| ContractAmendmentInfo : contractAmendmentInfo
ContractAmendmentInfo {
    array itemsBeingAmended
    string otherItemBeingAmended
    boolean relatedToCovid19
    boolean relatedToVaccination
    CapitationRatesAmendedInfo capitationRatesAmendedInfo
}

ContractAmendmentInfo ||--|| CapitationRatesAmendedInfo : capitationRatesAmendedInfo
CapitationRatesAmendedInfo {
    string reason
    string otherReason
}


Document {
    string name
    string S3URL
    string sha256
}


Contact {
    string name
    string titleRole
    string email
}

HealthPlanPackageFormData ||--|{ RateInfo : rateInfo
   RateInfo {
    enum rateType
    date rateDateStart
    date rateDateEnd
    date rateDateCertified
    array actuaryContacts
    enum actuaryCommunicationPreference
    array rateDocuments
    RateAmendmentInfo rateAmendmentInfo
    }

HealthPlanPackageFormData ||--|{ Contact : "stateContacts"
RateInfo ||--|{ Contact : "actuaryContacts"

RateInfo ||--|{ RateAmendmentInfo : rateAmendmentInfo
   RateAmendmentInfo {
    date effectiveDateStart
    date effectiveDateEnd
    }


ContractInfo ||--|{ Document : "contractDocuments"
HealthPlanPackageFormData ||--|{ Document : "documents"
RateInfo ||--|{ Document : "rateDocuments"


```
