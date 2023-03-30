# Error Handling

## Apollo Server Handling
[Apollo v3 - Error Handling](https://www.apollographql.com/docs/apollo-server/v3/data/errors)

When throwing errors from resolvers we should always throw `GraphQLError` or `ApolloError`. If a resolver throws an error that is not an `ApolloError` it gets converted to a generic `ApolloError` anyway. [Apollo Docs - Throwing errors](https://www.apollographql.com/docs/apollo-server/v3/data/errors#throwing-errors).

We also want to be including details about our error when we throw, this allows our front end to handle returned errors more specifically. 

The example below, we pass our error message in the first argument of `GraphQLError` and our details in the `extension` object in the second argument. The `extension` object can take in any `key: value` pair that will be returned to the front end. Two fields in we should always include in the `extension` objet are `code` and `cause`. The `code` field should be error codes defined in the [Apollo docs - Error codes](https://www.apollographql.com/docs/apollo-server/v3/data/errors#error-codes) and the `cause` field is where we can specify what caused the error code.

```typescript
throw new GraphQLError('Email failed.', {
    extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        cause: 'DB_ERROR',
    }
})
```

The above error is for `INTERNAL_SERVER_ERROR` codes, other codes are predefined classes in `'apollo-server-lambda'` and we can import them directly. These classes will have the `code` field already set, so we just need to pass in a message and extra details in the `extension` object.

```typescript
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'

if (planPackage.stateCode !== stateFromCurrentUser) {
    logError(
        'submitHealthPlanPackage',
        'user not authorized to fetch data from a different state'
    )
    setErrorAttributesOnActiveSpan(
        'user not authorized to fetch data from a different state',
        span
    )
    throw new ForbiddenError(
        'user not authorized to fetch data from a different state',
        {
            cause: 'USER_STATE_INVALID'
        }
    )
}

if (result === undefined) {
    const errMessage = `A draft must exist to be submitted: ${input.pkgID}`
    logError('submitHealthPlanPackage', errMessage)
    setErrorAttributesOnActiveSpan(errMessage, span)
    throw new UserInputError(errMessage, {
        argumentName: 'pkgID',
        cause: 'DRAFT_NOT_FOUND'
    })
}

```
