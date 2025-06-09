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

## Documentation Updates
- [ ] Update `docs/technical-design/error-handling.md` to reflect Apollo Server 4 error handling patterns
  - Remove references to `ApolloError`
  - Update examples to use `GraphQLError`
  - Update error code documentation
  - Update import statements

## Files to Update

### Frontend (app-web)
- [ ] `src/pages/MccrsId/MccrsId.tsx`
- [ ] `src/pages/APIAccess/APIAccess.tsx`
- [ ] `src/pages/StateSubmission/ErrorOrLoadingPage.tsx`
- [ ] `src/pages/Errors/ErrorFailedRequestPage.tsx`
- [ ] `src/pages/SubmissionSideNav/SubmissionSideNav.tsx`
- [ ] `src/pages/SubmissionSideNav/RateSummarySideNav.tsx`
- [ ] `src/pages/Settings/SettingsErrorAlert.tsx`
- [ ] `src/pages/Settings/Settings.tsx`
- [ ] `src/pages/Settings/SettingsTables/DivisionAssignmentTable.tsx`
- [ ] `src/hooks/useHealthPlanPackageForm.ts`
- [ ] `src/hooks/useContractForm.ts`

### Helpers Package
- [ ] `packages/helpers/src/gql/apolloErrors.ts`
- [ ] `packages/helpers/src/gql/mutationWrappersForUserFriendlyErrors.ts`

### Mocks Package
- [ ] `packages/mocks/src/apollo/userGQLMock.ts`
- [ ] `packages/mocks/src/apollo/approveContractMocks.ts`
- [ ] `packages/mocks/src/apollo/contractGQLMock.ts`
- [ ] `packages/mocks/src/apollo/healthPlanPackageGQLMock.ts`
- [ ] `packages/mocks/src/apollo/mcReviewSettingsGQLMocks.ts`

## Migration Steps
1. Create new error handling utilities using `GraphQLError`
2. Update backend resolvers to use new error handling
3. Update frontend error handling to work with new error format
4. Update mocks to reflect new error structure
5. Remove `apollo-server-lambda` dependency
6. Test all error scenarios thoroughly 