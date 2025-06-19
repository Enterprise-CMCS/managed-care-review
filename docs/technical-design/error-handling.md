# Error Handling

## Apollo Server Handling

[Apollo v4 - Error Handling](https://www.apollographql.com/docs/apollo-server/data/errors)

When throwing errors from resolvers we should always throw `GraphQLError` from the `graphql` package. Apollo Server v4 has deprecated Apollo-specific error classes like `ApolloError`, `ForbiddenError`, and `UserInputError` in favor of the standard `GraphQLError`. [Apollo Docs - Throwing errors](https://www.apollographql.com/docs/apollo-server/data/errors#throwing-errors).

We also want to be including details about our error when we throw, this allows our front end to handle returned errors more specifically.

In the example below, we pass our error message in the first argument of `GraphQLError` and our details in the `extension` object in the second argument. The `extension` object can take in any `key: value` pair that will be returned to the front end. Two fields in we should always include in the `extension` object are `code` and `cause`. The `code` field should be error codes defined in the [Apollo docs - Error codes](https://www.apollographql.com/docs/apollo-server/v3/data/errors#error-codes) and the `cause` field is where we can specify what caused the error code.

```typescript
throw new GraphQLError('Email failed.', {
    extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        cause: 'DB_ERROR',
    },
})
```

For other error codes, we now use helper functions from our `errorUtils.ts` file instead of Apollo Server v3 predefined classes. These helper functions create `GraphQLError` instances with the appropriate `code` field already set.

```typescript
import { createForbiddenError, createUserInputError } from '../errorUtils'

if (planPackage.stateCode !== stateFromCurrentUser) {
    logError(
        'submitHealthPlanPackage',
        'user not authorized to fetch data from a different state'
    )
    setErrorAttributesOnActiveSpan(
        'user not authorized to fetch data from a different state',
        span
    )
    throw createForbiddenError(
        'user not authorized to fetch data from a different state'
    )
}

if (result === undefined) {
    const errMessage = `A draft must exist to be submitted: ${input.pkgID}`
    logError('submitHealthPlanPackage', errMessage)
    setErrorAttributesOnActiveSpan(errMessage, span)
    throw createUserInputError(errMessage, 'pkgID')
}
```

## Available Error Helper Functions

We provide helper functions in `/services/app-api/src/resolvers/errorUtils.ts`:

- `createForbiddenError(message)` → `GraphQLError` with `FORBIDDEN` code
- `createUserInputError(message, argumentName?)` → `GraphQLError` with `BAD_USER_INPUT` code  
- `createNotFoundError(message)` → `GraphQLError` with `NOT_FOUND` code
- `createInternalServerError(message, cause?)` → `GraphQLError` with `INTERNAL_SERVER_ERROR` code
- `createAuthenticationError(message)` → `GraphQLError` with `UNAUTHENTICATED` code

These maintain the same error behavior for frontend consumers while using the standard `GraphQLError` class.
