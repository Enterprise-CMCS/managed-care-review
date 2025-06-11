# Error Handling

## Apollo Server Handling

[Apollo v4 - Error Handling](https://www.apollographql.com/docs/apollo-server/v4/data/errors)

When throwing errors from resolvers we should always throw `GraphQLError`. Apollo Server v4 removes `ApolloError` in favor of using `GraphQLError` directly. This change is part of Apollo Server's move towards better GraphQL spec compliance.

We want to include details about our error when we throw, this allows our front end to handle returned errors more specifically.

In the example below, we pass our error message in the first argument of `GraphQLError` and our details in the `extensions` object in the second argument. The `extensions` object can take in any `key: value` pair that will be returned to the front end. Two fields we should always include in the `extensions` object are `code` and `cause`. The `code` field should be error codes defined in the [Apollo docs - Error codes](https://www.apollographql.com/docs/apollo-server/v4/data/errors#error-codes) and the `cause` field is where we can specify what caused the error code.

```typescript
throw new GraphQLError('Email failed.', {
    extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        cause: 'DB_ERROR',
    },
})
```

For predefined error codes, we can create custom error classes that extend `GraphQLError`. These classes will have the `code` field already set, so we just need to pass in a message and extra details in the `extensions` object.

```typescript
class ForbiddenError extends GraphQLError {
    constructor(message: string, extensions?: Record<string, any>) {
        super(message, {
            extensions: {
                code: 'FORBIDDEN',
                ...extensions,
            },
        })
    }
}

class UserInputError extends GraphQLError {
    constructor(message: string, extensions?: Record<string, any>) {
        super(message, {
            extensions: {
                code: 'BAD_USER_INPUT',
                ...extensions,
            },
        })
    }
}

// Usage examples:
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
            cause: 'USER_STATE_INVALID',
        }
    )
}

if (result === undefined) {
    const errMessage = `A draft must exist to be submitted: ${input.pkgID}`
    logError('submitHealthPlanPackage', errMessage)
    setErrorAttributesOnActiveSpan(errMessage, span)
    throw new UserInputError(errMessage, {
        argumentName: 'pkgID',
        cause: 'DRAFT_NOT_FOUND',
    })
}
```

## Error Handling in Tests

When testing error scenarios, we should use `GraphQLError` directly in our mocks. Here's an example of how to mock an error response:

```typescript
const mockError = new GraphQLError('Error message', {
    extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        cause: 'DB_ERROR',
    },
})

return {
    request: {
        query: YourQueryDocument,
        variables: { /* your variables */ },
    },
    error: mockError,
    result: {
        data: null,
        errors: [mockError],
    },
}
```

## Frontend Error Handling

In the frontend, we should handle GraphQL errors by checking the `graphQLErrors` array in the error response. Each error will have a `message` and `extensions` object containing the error code and cause.

```typescript
try {
    const { data } = await submitMutation()
    // Handle success
} catch (error) {
    if (error.graphQLErrors) {
        const graphQLError = error.graphQLErrors[0]
        const errorCode = graphQLError.extensions?.code
        const errorCause = graphQLError.extensions?.cause
        
        switch (errorCode) {
            case 'FORBIDDEN':
                // Handle forbidden error
                break
            case 'BAD_USER_INPUT':
                // Handle user input error
                break
            default:
                // Handle other errors
        }
    }
}
```
