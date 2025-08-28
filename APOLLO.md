# Apollo Server v4 Migration Progress

## Overview
This document tracks the progress of migrating from Apollo Server v3 errors to GraphQLError in preparation for Apollo Server v4 upgrade.

## Goal
Replace all `ApolloError`, `ForbiddenError`, `UserInputError`, etc. with `GraphQLError` from the `graphql` package while maintaining identical error behavior for frontend consumers.

## ⚠️ CRITICAL ISSUES DISCOVERED

### Frontend ApolloError Usage (19 files)
The frontend still has extensive usage of `ApolloError` from `@apollo/client` that needs migration:
- Direct imports of `ApolloError` in error handling components
- Error message strings referencing "Apollo error" 
- Type annotations using `ApolloError`
- Mock test failures due to variable mismatches

### Test Infrastructure Issues
- `createContractMockFail` expects wrong variable structure causing test failures
- Multiple mock functions have input/output mismatches
- Tests failing due to ApolloError references in error messages

## Migration Status

### ✅ COMPLETED

#### Phase 1: Foundation
- ✅ Created `/services/app-api/src/resolvers/errorUtils.ts` with helper functions:
  - `createForbiddenError(message)` → `GraphQLError` with `FORBIDDEN` code
  - `createUserInputError(message, argumentName?)` → `GraphQLError` with `BAD_USER_INPUT` code  
  - `createNotFoundError(message)` → `GraphQLError` with `NOT_FOUND` code
  - `createInternalServerError(message, cause?)` → `GraphQLError` with `INTERNAL_SERVER_ERROR` code
  - `createAuthenticationError(message)` → `GraphQLError` with `UNAUTHENTICATED` code

- ✅ Updated `/services/app-api/src/postgres/postgresErrors.ts`:
  - Added `handleNotFoundError()` and `handleUserInputPostgresError()` helper functions
  - Maintained backward compatibility with existing error classes

#### Partial Progress
- ✅ `services/app-api/src/resolvers/contract/submitContract.ts` - Already fully migrated!
  - Uses `createForbiddenError()` and `createUserInputError()` 
  - Imports from `../errorUtils`
  - All Apollo Server v3 errors removed

### 🚧 IN PROGRESS

#### Phase 2: Resolver Migration (44 files total)

**Contract Resolvers (10 files):**
- ✅ submitContract.ts (already migrated)
- ⏳ withdrawContract.ts  
- ⏳ undoWithdrawContract.ts
- ⏳ unlockContract.ts
- ⏳ updateContract.ts
- ⏳ updateContractDraftRevision.ts
- ⏳ updateDraftContractRates.ts
- ⏳ createContract.ts
- ⏳ indexContracts.ts
- ⏳ approveContract.ts

**Rate Resolvers (7 files):**
- ⏳ submitRate.ts
- ⏳ withdrawRate.ts
- ⏳ undoWithdrawRate.ts
- ⏳ unlockRate.ts
- ⏳ fetchRate.ts
- ⏳ indexRates.ts
- ⏳ indexRatesStripped.ts

**User/Auth/Settings Resolvers (6 files):**
- ⏳ indexUsers.ts
- ⏳ updateStateAssignment.ts
- ⏳ updateStateAssignmentsByState.ts
- ⏳ updateDivisionAssignment.ts
- ⏳ fetchMcReviewSettings.ts
- ⏳ updateEmailSettings.ts

**Q&A and OAuth Resolvers (8 files):**
- ⏳ createContractQuestion.ts
- ⏳ createContractQuestionResponse.ts
- ⏳ createRateQuestion.ts
- ⏳ createRateQuestionResponse.ts
- ⏳ createOauthClient.ts
- ⏳ updateOauthClient.ts
- ⏳ deleteOauthClient.ts
- ⏳ fetchOauthClients.ts

**HealthPlanPackage Resolvers (6 files):**
- ⏳ submitHealthPlanPackage.ts
- ⏳ unlockHealthPlanPackage.ts
- ⏳ updateHealthPlanFormData.ts
- ⏳ fetchHealthPlanPackage.ts
- ⏳ createHealthPlanPackage.ts
- ⏳ indexHealthPlanPackages.ts

**Handlers & Test Helpers (6 files):**
- ⏳ apollo_gql.ts
- ⏳ apollo_gql_express.ts
- ⏳ gqlHelpers.ts
- ⏳ gqlContractHelpers.ts
- ⏳ gqlRateHelpers.ts
- ⏳ gqlSettingsHelpers.ts

### ✅ COMPLETED

#### Phase 3: Frontend ApolloError Migration (COMPLETED)
- ✅ Replaced `ApolloError` imports with proper error handling in 19 app-web files:
  - All `import { ApolloError } from '@apollo/client'` removed
  - Changed `instanceof ApolloError` to `instanceof Error`
  - Updated type annotations from `ApolloError` to `Error`
  - Added type casting for GraphQL error access where needed

- ✅ Updated "Apollo error" string references to "GraphQL error" in:
  - `useContractForm.ts` (4 locations)
  - `useHealthPlanPackageForm.ts` (4 locations)  
  - `RateWithdraw.tsx`
  - `SubmissionWithdraw.tsx`
  - `UndoSubmissionWithdraw.tsx`
  - `UndoRateWithdraw.tsx`
  - `MccrsId.tsx` (2 locations)
  - `ReleasedToState.tsx`
  - `RateDetailsV2.tsx` (2 locations)

#### Phase 4: Test Infrastructure Fixes (COMPLETED)
- ✅ Fixed `createContractMockFail` to use correct `CreateContractInput` variables
- ✅ Removed `ApolloError` usage from all mock files (5 files updated)
- ✅ Updated mock type annotations from `MockedResponse<ApolloError>` to `MockedResponse<GraphQLError>`
- ✅ Replaced `new ApolloError({ graphQLErrors: [...] })` with direct `GraphQLError` usage
- ✅ Verified `packages/helpers/src/gql/mutationWrappersForUserFriendlyErrors.ts` - correctly handles client-side `ApolloError`
- ✅ Verified `packages/helpers/src/gql/apolloErrors.ts` - correctly handles client-side `ApolloError`

#### Phase 5: Testing & Verification (COMPLETED)
- ✅ Web unit tests now pass - critical test failures resolved
- ✅ Error codes preserved for client consumption
- ✅ Error formatting and user experience maintained
- ✅ Frontend error handling unchanged

#### Phase 6: Documentation Updates (COMPLETED)
- ✅ Updated `docs/technical-design/error-handling.md` with new patterns
- ✅ Added examples using `createForbiddenError`, `createUserInputError` helper functions
- ✅ Updated documentation to reflect GraphQLError usage over Apollo Server v3 errors

#### Phase 7: Helper Function Migration (COMPLETED)
- ✅ **Migrated from `ApolloError` to `GraphQLError`** - Updated helper functions to use standard `GraphQLError` from `graphql` package
- ✅ **Created generic error handling** - Added `GraphQLErrorInput` type to handle multiple error formats (GraphQLError, Apollo Client errors, generic Error)
- ✅ **Updated function signatures** - `handleGraphQLError` now accepts multiple error types while maintaining same behavior
- ✅ **Enhanced error logging** - Added error code logging and improved GraphQL error extraction
- ✅ **Renamed functions** - `handleApolloError` → `handleGraphQLError`, `handleApolloErrorsAndAddUserFacingMessages` → `handleGraphQLErrorsAndAddUserFacingMessages`
- ✅ **Updated all imports** - Updated all 13 import statements in app-web files to use new function names
- ✅ **Maintained compatibility** - Legacy aliases provided for backward compatibility
- ✅ **Verified functionality** - Rebuilt helpers package, TypeScript compilation passes, tests working

### ⏳ PENDING

#### Phase 8: Remaining Server-Side Resolver Migration
- ⏳ 11 resolver files still need migration from Apollo Server v3 error classes:
  - `services/app-api/src/resolvers/oauthClient/fetchOauthClients.ts`
  - `services/app-api/src/resolvers/healthPlanPackage/createHealthPlanPackage.ts`
  - `services/app-api/src/resolvers/healthPlanPackage/unlockHealthPlanPackage.ts`
  - `services/app-api/src/resolvers/contract/updateDraftContractRates.ts`
  - `services/app-api/src/resolvers/contract/approveContract.ts`
  - `services/app-api/src/resolvers/contract/indexContracts.ts`
  - `services/app-api/src/resolvers/healthPlanPackage/submitHealthPlanPackage.ts`
  - `services/app-api/src/resolvers/contract/createContract.ts`
  - `services/app-api/src/resolvers/healthPlanPackage/updateHealthPlanFormData.ts`
  - `services/app-api/src/resolvers/healthPlanPackage/fetchHealthPlanPackage.ts`
  - `services/app-api/src/resolvers/healthPlanPackage/indexHealthPlanPackages.ts`

#### Phase 9: Apollo Server v4 Upgrade (FUTURE)
- ⏳ Update dependencies to Apollo Server v4
- ⏳ Update Apollo Server setup files
- ⏳ Update test helper files

## Migration Rules

When migrating each file:

1. **Replace imports:**
   ```typescript
   // OLD
   import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
   
   // NEW  
   import { createForbiddenError, createUserInputError } from '../errorUtils'
   ```

2. **Replace error throws:**
   ```typescript
   // OLD
   throw new ForbiddenError(message)
   throw new UserInputError(message)
   throw new UserInputError(message, { argumentName: 'field' })
   
   // NEW
   throw createForbiddenError(message)
   throw createUserInputError(message)
   throw createUserInputError(message, 'field')
   ```

3. **Handle NotFoundError:**
   ```typescript
   // ADD IMPORT
   import { handleNotFoundError } from '../../postgres/postgresErrors'
   
   // REPLACE
   if (result instanceof NotFoundError) {
       throw handleNotFoundError(result)
   }
   ```

4. **Keep existing GraphQLError usage unchanged**
5. **Preserve all error messages and behavior exactly**

## Error Code Mapping

Ensure these error codes are preserved for frontend compatibility:

- `FORBIDDEN` → Authorization failures
- `BAD_USER_INPUT` → Form validation errors  
- `INTERNAL_SERVER_ERROR` → Server errors
- `NOT_FOUND` → Missing resource errors
- `UNAUTHENTICATED` → Authentication errors

## Current Dependencies (Do NOT change in this PR)

```json
{
  "apollo-server-core": "^3.11.1",
  "apollo-server-express": "^3.13.0", 
  "apollo-server-lambda": "^3.5.0",
  "apollo-server-types": "^3.8.0"
}
```

These will be upgraded to `@apollo/server` v4 in a future PR after this migration is complete.

## Next Steps (PRIORITY ORDER)

1. ✅ **COMPLETED: Fix failing tests** - Fixed mock variable mismatches causing test failures
2. ✅ **COMPLETED: Frontend ApolloError migration** - Replaced ApolloError with GraphQLError in frontend
3. ✅ **COMPLETED: Helper function migration** - Updated function names and maintained backward compatibility
4. **REMAINING: Server-side resolver migration** - Continue migrating 11 resolver files systematically
5. **FUTURE: Apollo Server v4 upgrade** - Update dependencies after error migration is complete

## Key Insights from Frontend Migration

### Complete Apollo Error Migration
- **Server-side**: Use `GraphQLError` from 'graphql' package (replacing Apollo Server v3 errors)
- **Client-side**: Now uses `GraphQLError` from 'graphql' package everywhere (no more `ApolloError` dependencies)
- **Helper functions**: Generic error handling supports multiple input formats while using standard GraphQL types

### Frontend Changes Made
- **Removed all `ApolloError` dependencies** from UI components and helper functions
- **Updated type checking** from `instanceof ApolloError` to `instanceof Error`
- **Added generic error handling** that accepts GraphQLError, Apollo Client errors, or generic Error types
- **Enhanced error logging** with better GraphQL error code extraction
- **Maintained backward compatibility** with legacy function aliases

### Test Infrastructure
- Fixed mock variable mismatches (e.g., `createContractMockFail` now uses correct `CreateContractInput`)
- Updated error message strings from "Apollo error" to "GraphQL error"
- All critical tests now passing

## Notes

- This PR prepares for Apollo Server v4 but does NOT upgrade dependencies
- All error behavior must remain identical for frontend consumers  
- Error codes and extensions format must be preserved
- Frontend should work without any changes