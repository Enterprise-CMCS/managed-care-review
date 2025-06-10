# Apollo Server Upgrade to v4

## Overview
This document outlines the necessary changes to upgrade our Apollo Server implementation to version 4, with a specific focus on error handling changes.

## Breaking Changes
- Apollo Server 4 removes `ApolloError` in favor of `GraphQLError`
- Custom error codes (e.g., `ForbiddenError`) need to be implemented using `GraphQLError`
- This change is part of Apollo Server's move towards better GraphQL spec compliance

## Required Changes
1. Replace all instances of `ApolloError` with `GraphQLError`
2. Update error handling patterns to use GraphQL's native error system
3. Implement custom error codes using `GraphQLError` extensions
4. Remove `apollo-server-lambda` dependency once all changes are complete

## Benefits
- Better alignment with GraphQL specification
- Improved error handling consistency
- Removal of deprecated features
- Cleaner dependency tree

## Implementation Notes
- Custom error codes should be implemented using the `extensions` field of `GraphQLError`
- Error handling should follow GraphQL best practices
- Consider implementing a custom error formatter if needed

## Error Handling Changes
Apollo Server 4 removes both `ApolloError` and `toApolloError` in favor of using `GraphQLError`. The `graphql` package exports `GraphQLError`, and it should be used like this:

```typescript
import { GraphQLError } from 'graphql';

// ...
throw new GraphQLError(message, {
  extensions: { code: 'YOUR_ERROR_CODE' },
});
```

If you previously used the optional code argument with `ApolloError`:
```typescript
throw new ApolloError(message, 'YOUR_ERROR_CODE');
```

You should now pass your error code to `GraphQLError`'s extensions option as shown in the first example.

## Specific Changes Required

### Mock Files with `new ApolloError` Instances
The following files contain direct instantiations of `ApolloError` that need to be updated:

1. ✅ `packages/mocks/src/apollo/approveContractMocks.ts`
   - Change: Replace `new ApolloError({...})` with `new GraphQLError(message, { extensions: {...} })`
   - Note: Preserve any error codes and metadata in the extensions object
   - Status: Completed - Removed ApolloError wrapper, using GraphQLError directly

2. ✅ `packages/mocks/src/apollo/userGQLMock.ts` (2 instances)
   - Change: Update mock error responses to use `GraphQLError`
   - Note: Ensure error codes and network error information is preserved in extensions
   - Status: Completed - Removed ApolloError wrapper, using GraphQLError directly
   - Changes:
     - Updated return type to `MockedResponse<GraphQLError>`
     - Removed ApolloError wrapper
     - Added errors array to result object
     - Fixed error message in updateStateAssignmentsMutationMockFailure

3. ✅ `packages/mocks/src/apollo/contractGQLMock.ts` (5 instances)
   - Change: Update all contract-related error mocks
   - Note: These are used in contract-related tests, ensure test expectations are updated
   - Status: Completed - Removed ApolloError wrapper, using GraphQLError directly
   - Changes:
     - Updated all 5 mock functions to use GraphQLError directly
     - Removed ApolloError import and usage
     - Preserved error metadata in GraphQLError extensions
     - Updated return types to use GraphQLError

4. ✅ `packages/mocks/src/apollo/mcReviewSettingsGQLMocks.ts`
   - Change: Update settings error mock
   - Note: Verify settings-related error handling in tests
   - Status: Completed - Removed ApolloError wrapper, using GraphQLError directly
   - Changes:
     - Removed ApolloError import
     - Updated return type to use GraphQLError
     - Removed ApolloError wrapper
     - Added errors array to result object
     - Maintained error metadata (code, cause, message)
   - Test Impact:
     - Settings.test.tsx - No changes needed
     - EditStateAssign.test.tsx - No changes needed
     - Error handling remains compatible with existing tests

5. ✅ `packages/mocks/src/apollo/healthPlanPackageGQLMock.ts` (3 instances)
   - Change: Update health plan package error mocks
   - Note: These are critical for health plan package testing
   - Status: Completed - Removed ApolloError wrapper, using GraphQLError directly
   - Changes:
     - Removed ApolloError import
     - Updated all three mock functions to use GraphQLError:
       - submitHealthPlanPackageMockError
       - unlockHealthPlanPackageMockError
       - unlockContractMockError
     - Updated return types to use GraphQLError
     - Removed ApolloError wrappers
     - Added errors array to result objects
     - Maintained error metadata (code, cause, message)
   - Test Impact:
     - UnlockSubmitModal.test.tsx - No changes needed
     - Error handling remains compatible with existing tests
     - Error messages and structure preserved

### Type References
The following files need type updates but don't create new instances:
- Frontend components that import and type-check against `ApolloError`
- Helper functions that handle error types
- Test files that expect `ApolloError` instances

## Documentation Updates
- [x] Update `docs/technical-design/error-handling.md` to reflect Apollo Server 4 error handling patterns
  - Removed references to `ApolloError`
  - Updated examples to use `GraphQLError`
  - Updated error code documentation
  - Updated import statements
  - Added new sections:
    - Error Handling in Tests
    - Frontend Error Handling
  - Added custom error class examples
  - Updated links to Apollo v4 documentation

## Files to Update

### Frontend (app-web)
1. [ ] `src/pages/MccrsId/MccrsId.tsx`
   - Change: Update error handling to use GraphQLError
   - Note: Used in MCCRS ID page error states
   - Required Changes:
     - Remove ApolloError imports
     - Update error type checking
     - Update error message display logic

2. [ ] `src/pages/APIAccess/APIAccess.tsx`
   - Change: Update API access error handling
   - Note: Handles API key management errors
   - Required Changes:
     - Update error type imports
     - Modify error handling logic
     - Update error display components

3. [ ] `src/pages/StateSubmission/ErrorOrLoadingPage.tsx`
   - Change: Update submission error handling
   - Note: Critical for state submission workflow
   - Required Changes:
     - Update error type definitions
     - Modify error state handling
     - Update error message formatting

4. [ ] `src/pages/Errors/ErrorFailedRequestPage.tsx`
   - Change: Update general error handling
   - Note: Used across multiple error scenarios
   - Required Changes:
     - Update error type checking
     - Modify error message extraction
     - Update error display logic

5. [ ] `src/pages/SubmissionSideNav/SubmissionSideNav.tsx`
   - Change: Update navigation error handling
   - Note: Handles submission navigation errors
   - Required Changes:
     - Update error type imports
     - Modify error state management
     - Update error display components

6. [ ] `src/pages/SubmissionSideNav/RateSummarySideNav.tsx`
   - Change: Update rate summary error handling
   - Note: Handles rate-related navigation errors
   - Required Changes:
     - Update error type definitions
     - Modify error handling logic
     - Update error display components

7. [ ] `src/pages/Settings/SettingsErrorAlert.tsx`
   - Change: Update settings error handling
   - Note: Critical for settings management
   - Required Changes:
     - Update error type checking
     - Modify error message formatting
     - Update error display logic

8. [ ] `src/pages/Settings/Settings.tsx`
   - Change: Update main settings error handling
   - Note: Core settings page error management
   - Required Changes:
     - Update error type imports
     - Modify error state handling
     - Update error display components

9. [ ] `src/pages/Settings/SettingsTables/DivisionAssignmentTable.tsx`
   - Change: Update division assignment error handling
   - Note: Handles division-related errors
   - Required Changes:
     - Update error type definitions
     - Modify error handling logic
     - Update error display components

10. [ ] `src/hooks/useHealthPlanPackageForm.ts`
    - Change: Update form error handling
    - Note: Critical for health plan package forms
    - Required Changes:
      - Update error type checking
      - Modify error state management
      - Update error handling utilities

11. [ ] `src/hooks/useContractForm.ts`
    - Change: Update contract form error handling
    - Note: Essential for contract management
    - Required Changes:
      - Update error type definitions
      - Modify error handling logic
      - Update error state management

### Helpers Package
- [ ] `packages/helpers/src/gql/apolloErrors.ts`
  - Change: Update error handling utilities
  - Note: Core error handling utilities
  - Required Changes:
    - Remove ApolloError imports
    - Update error type definitions
    - Create new GraphQLError utilities
    - Update error code mappings
    - Add error message formatters

- [ ] `packages/helpers/src/gql/mutationWrappersForUserFriendlyErrors.ts`
  - Change: Update mutation error wrappers
  - Note: Critical for user-friendly error handling
  - Required Changes:
    - Update error type imports
    - Modify error wrapping logic
    - Update error message formatting
    - Add GraphQLError specific handling

### Mocks Package
- [x] `packages/mocks/src/apollo/approveContractMocks.ts`
- [x] `packages/mocks/src/apollo/userGQLMock.ts`
- [x] `packages/mocks/src/apollo/contractGQLMock.ts`
- [x] `packages/mocks/src/apollo/mcReviewSettingsGQLMocks.ts`
- [x] `packages/mocks/src/apollo/healthPlanPackageGQLMock.ts`

## Migration Steps
1. Create new error handling utilities using `GraphQLError`
2. Update backend resolvers to use new error handling
3. Update frontend error handling to work with new error format
4. Update mocks to reflect new error structure
5. Remove `apollo-server-lambda` dependency
6. Test all error scenarios thoroughly
7. Update documentation and examples
8. Perform end-to-end testing
9. Deploy changes in stages
10. Monitor error handling in production

## Testing Strategy
1. Unit Tests
   - Test individual error handling components
   - Verify error message formatting
   - Check error type conversions
   - Validate error code mappings

2. Integration Tests
   - Test error handling across components
   - Verify error propagation
   - Check error state management
   - Validate error recovery

3. End-to-End Tests
   - Test complete error scenarios
   - Verify user experience
   - Check error message clarity
   - Validate error handling flow

## Rollout Plan
1. Development
   - Update mocks and utilities
   - Modify frontend components
   - Update test files
   - Perform local testing

2. Staging
   - Deploy changes to staging
   - Run full test suite
   - Verify error handling
   - Check error messages

3. Production
   - Deploy in phases
   - Monitor error rates
   - Check error handling
   - Gather user feedback

## Success Criteria
1. All ApolloError instances replaced with GraphQLError
2. Error handling works consistently across the application
3. Error messages are clear and user-friendly
4. Tests pass with new error format
5. No regression in error handling functionality
6. Improved error tracking and debugging
7. Better alignment with GraphQL specification 