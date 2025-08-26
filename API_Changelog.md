# Managed Care Review - API Changelog
## This document highlights API changes that have been introduced since May 2025

### August 25, 2025
#### Added
- New endpoint `fetchDocument` added to the API
    - Parameters
        - `documentID`: the `id` of the document to be retrieved
        - `documentType`: optional field that represents the type of document to be retrieved. Can be one of:  CONTRACT_DOC, CONTRACT_SUPPORTING_DOC, RATE_DOC, RATE_SUPPORTING_DOC, CONTRACT_QUESTION_DOC, CONTRACT_QUESTION_RESPONSE_DOC, RATE_QUESTION_DOC, RATE_QUESTION_RESPONSE_DOC. Using this parameter gives a performance boost
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