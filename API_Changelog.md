# Managed Care Review - API Changelog

## This document highlights API changes that have been introduced since May 2025. See the full [GraphQL schema](services/app-graphql/src/schema.graphql).

### April 20, 2026

#### Updated

- **`indexRates`** and **`indexRatesStripped`** endpoints updated to accept two new optional parameters (via `IndexRatesInput`):
    - **`rateIDs`**: an optional array of rate ID strings. When provided, only rates matching those IDs are returned. Useful for batch-fetching a known set of rates in a single request. Draft rates are excluded regardless of whether their ID is in the list.
    - **`updatedSince`**: an optional `DateTime`. When provided, only rates where the rate row, any submitted revision, or the revision's submit record has an `updatedAt` at or after this timestamp are returned. Designed for incremental pulls — pass your last-run timestamp to receive only rates that are new or have changed since then.
    - When both are omitted, behavior is unchanged — all submitted rates are returned.

### April 1, 2026

#### Added

- `isDeprecated` and `deprecatedByProgramId` added to the `Program` GraphQL type.
    - `isDeprecated` required `Boolean`, indicates whether the program has been retired from new selection.
    - `deprecatedByProgramId` nullable `String`, optionally identifies the replacement program when one exists.
    - Affected endpoints:
        - `fetchCurrentUser`
        - `fetchContract`
        - `fetchRate`
        - `fetchMcReviewSettings`
        - `indexContracts`
        - `indexContractsStripped`
        - `indexRates`
        - `indexRatesStripped`
        - `indexUsers`

### March 16, 2026

#### Added

- New mutation `reverseApproveContract` added to the API
    - Reverses a previously approved contract. CMS users only.
    - Parameters (via `ReverseApproveContractInput`)
        - `contractID`: required ID, the ID of the contract to reverse approval for
        - `updatedReason`: required String, the reason for reversing the approval
    - Returns `ReverseApproveContractPayload`
        - `contract`: Contract
    - Errors
        - `ForbiddenError`: A non-CMS or non-Admin user called this
        - `UserInputError`: The contract is not in an approved status, or the latest review action is not `MARK_AS_APPROVED`
        - `INTERNAL_SERVER_ERROR`: DB_ERROR — a contract cannot be found by id

### March 12, 2026

#### Added

- New endpoint `generateUploadURL` added to the API
    - Parameters
        - `fileName`: required String, the full name of the file including extension
        - `fileType`: required enum, corresponds to the file's extension, possible values: `[PDF, DOC, DOCX, XLS, XLSX, XLSM, CSV]`
        - `bucketName`: required enum, corresponds to the bucket the file should be uploaded to, possible values: `[HEALTH_PLAN_DOCS, QUESTION_ANSWER_DOCS]`
    - Returns
        - bucket: String
        - expiresIn: Int
        - s3Key: String
        - s3URL: String
        - uploadURL: String

### January 29, 2026

#### Added

- New submission status of `NOT_SUBJECT_TO_REVIEW`. For EQRO submissions that do not require CMS review.
    - `NOT_SUBJECT_TO_REVIEW` to the enum `ContractReviewStatus` in GraphQL.
    - `NOT_SUBJECT_TO_REVIEW` to the enum `ConsolidatedContractStatus` in GraphQL.
    - `NOT_SUBJECT_TO_REVIEW` to the enum `ContractActionType` in GraphQL.

#### Updated

- `ContractReviewStatusActions` GraphQL type.
    - `updatedBy` field is now optional.

### November 13, 2025

#### Added

- `EQRO` contract submission type fields to `ContractFormData` GraphQL type.

    ```graphql
        type ContractFormData {
            ...existing fields,
            "If contract has a new EQRO contractor"
            eqroNewContractor: Boolean
            "If new optional activities to be performed on MCOs"
            eqroProvisionMcoNewOptionalActivity: Boolean
            "If new MCO managed care program has EQR-related activities"
            eqroProvisionNewMcoEqrRelatedActivities: Boolean
            "If EQR-related activities are performed on the CHIP population"
            eqroProvisionChipEqrRelatedActivities: Boolean
            "EQR or EQR-related activities are performed on MCOs"
            eqroProvisionMcoEqrOrRelatedActivities: Boolean
        }
    ```

    - These new fields on the `ContractFormData` are `EQRO` contract submission form fields. They are questions asked for `EQRO` contract submissions only in the MC-Review state portal app.
    - Affected endpoints:
        - `fetchContract`
        - `indexContracts`
        - `fetchRate`
        - `indexRates`

### October 30, 2025

#### Added

- `contractSubmissionType` to the `Contract` and `UnlockedContract` GraphQL type.
    - `contractSubmissionType` label the contract type of the submission. At this time there are two types a contract can be `HEALTH_PLAN` and `EQRO`.
    - Affected endpoints:
        - `fetchContract`
        - `indexContracts`

### October 16, 2025

#### Updated

- **IndexContracts** endpoint updated to accept 2 optional parameters:
    - **updatedWithin**: an integer, representing seconds. Only submissions that have been updated within the specified timeframe will be returned
    - **statusesToExclude**: An array of statuses to exclude in the filtered results.
      Valid statuses include: - DRAFT - SUBMITTED - UNLOCKED - RESUBMITTED - APPROVED - WITHDRAWN

### September 4, 2025

#### Added

- **ID** field added to `Document` GraphQL type (optional)
    - The Document type is used for Q&A document responses
    - API endpoints that return Document data will now include the document ID when available
    - **Affected endpoints:**
        - `fetchContract`
        - `fetchRate`
        - `fetchDocument`

### August 25, 2025

#### Added

- New endpoint `fetchDocument` added to the API
    - Parameters
        - `documentID`: the `id` of the document to be retrieved
        - `documentType`: optional field that represents the type of document to be retrieved. Can be one of: CONTRACT_DOC, CONTRACT_SUPPORTING_DOC, RATE_DOC, RATE_SUPPORTING_DOC, CONTRACT_QUESTION_DOC, CONTRACT_QUESTION_RESPONSE_DOC, RATE_QUESTION_DOC, RATE_QUESTION_RESPONSE_DOC. Using this parameter gives a performance boost
        - `expiresIn`: represents times in seconds until the downloadURL's expiration. Valid range from 1 second to 604,800 seconds (1 week). Defaults to 3600 seconds (1 hour)
    - Returns a SharedDocument type
        - id: String
        - name: String
        - s3URL: String
        - sha256: String
        - downloadURL: String

### July 9, 2025

#### Added

- `rateMedicaidPopulations` optional array field, possible values: `["MEDICARE_MEDICAID_WITH_DSNP", "MEDICAID_ONLY", "MEDICARE_MEDICAID_WITHOUT_DSNP"]`, added to `formData` on `RateRevision`. This change affects all queries and mutations that include `RateFormData`

### June 27, 2025

#### Added

- `dsnpContract` optional field (`boolean` type) added to `formData` on `ContractRevision`. This change affects all queries and mutations that include `ContractFormData`

### June 20, 2025

#### Added

- `round` field (`int` type) added to `RateQuestion`

### June 9, 2025

#### Added

- `id` field added to `GenericDocument`

### May 9, 2025

#### Deleted

- `withdrawInfo` field was removed from `Rate`
- `withdrawInfo` field was removed from `RateStripped`

### May 2, 2025

#### Deleted

- `withdrawAndReplaceRedundantRate` endpoint deleted. It was an Admin only action that was used to address bookkeeping errors with rates
