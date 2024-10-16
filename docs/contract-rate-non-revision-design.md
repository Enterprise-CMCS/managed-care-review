# Contract and Rate Without Revisions Design

This is an ER diagram of the data that is planned to be sent to Salesforce on submission. It relies on Salesforce's native diff tracking so elides the concept of Revisions. 

```mermaid
erDiagram

Contract {
    String externalID
    String externalURL
    DateTime initiallySubmittedAt
    DateTime updatedAt
    StateCode stateCode
    String name
    String mccrsID
    String submissionReason

    String[] programNicknames
    PopulationCoveredEnum populationCovered "MEDICAID, CHIP, MEDICAID_AND_CHIP" 
    SubmissionTypeEnum submissionType "CONTRACT_ONLY, CONTRACT_AND_RATES"
    Boolean riskBasedContract
    String submissionDescription
    Document[] contractDocuments
    Document[] supportingDocuments
    ContractTypeEnum contractType "BASE, AMENDMENT"
    ContractExecutionStatusEnum contractExecutionStatus "EXECUTED, UNEXECUTED"
    CalendarDate contractDateStart
    CalendarDate contractDateEnd
    String[] managedCareEntities
    String[] federalAuthorities
    Boolean statutoryRegulatoryAttestation
    String statutoryRegulatoryAttestationDescription

    Boolean inLieuServicesAndSettings
    Boolean modifiedBenefitsProvided
    Boolean modifiedGeoAreaServed
    Boolean modifiedMedicaidBeneficiaries
    Boolean modifiedRiskSharingStrategy
    Boolean modifiedIncentiveArrangements
    Boolean modifiedWitholdAgreements
    Boolean modifiedStateDirectedPayments
    Boolean modifiedPassThroughPayments
    Boolean modifiedPaymentsForMentalDiseaseInstitutions
    Boolean modifiedMedicalLossRatioStandards
    Boolean modifiedOtherFinancialPaymentIncentive
    Boolean modifiedEnrollmentProcess
    Boolean modifiedGrevienceAndAppeal
    Boolean modifiedNetworkAdequacyStandards
    Boolean modifiedLengthOfContract
    Boolean modifiedNonRiskPaymentArrangements
    Boolean statutoryRegulatoryAttestation
    Boolean statutoryRegulatoryAttestationDescription
    
}

Rate {
    String externalID
    String externalURL
    DateTime initiallySubmittedAt
    DateTime updatedAt
    StateCode stateCode
    String name
    String submissionReason
    
    RateTypeEnum rateType "NEW, AMENDMENT"
    RateCapitationTypeEnum rateCapitationType "RATE_CELL, RATE_RANGE"

    String[] programNicknames
    Document[] rateDocuments
    Document[] supportingDocuments

    CalendarDate rateDateStart
    CalendarDate rateDateEnd
    CalendarDate rateDateCertified
    CalendarDate amendmentEffectiveDateStart
    CalendarDate amendmentEffectiveDateEnd

    Enum actuaryCommunicationPreference "OACT_TO_ACTUARY, OACT_TO_STATE"
}

Document {
    FileData fileData
    string fileName
}

Contact {
    string email
    string givenName
    string familyName
    string title
    string ActuarialFirm
}

Contract }|--|{ Rate : "many to many"
Contract ||--|{ Document : "one to many"
Rate ||--|{ Document : "one to many"
Rate }|--|{ Contact : "certifying actuaries"
Rate }|--|{ Contact : "additional actuaries"
Contract }|--|{ Contact : "state contacts"
```
