# Managed Care Review - API Changelog
## This document highlights API changes that have been introduced since May 2025

### July 16, 2025
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