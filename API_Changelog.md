# Managed Care Review - API Changelog
## This document highlights API changes that have been introduced since May 2025

### June 27, 2025
#### Added
- `dsnpContract` optional field (`boolean` type) added to `ContractRevision`. This affects, `CreateContract`, `FetchContract`, `UpdateContractDraftRevision` and `SubmitContract` endpoints

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