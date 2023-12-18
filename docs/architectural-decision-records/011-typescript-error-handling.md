# 011 — Error Handling In Typescript

_Things fall apart; the center cannot hold;_

Sometimes the code we call will error. There are a number of different ways to handle errors in typescript but we should standardize on a single one. This ADR covers how we want to deal with errors from a control-flow perspective, ADR 012 covers what types of errors we want to return in our modules.

## Considered Options

### Functions that can error return their success type unioned with the Error type

For example, our postgres store functions like insertDraftSubmission should return the DraftSubmissionType that was inserted when the insertion is successful, or an Error type if not. So the signature will look like:

```
function insertDraftSubmission(args: {...}): DraftSubmissionType | Error
```

The compiler will the enforce that callers handle the error, if you don't discriminate between success and error with the result of your function call, the compiler will complain that you might be operating on an Error instead of whatever you expect to get back. For example:

```
const insertResult = await store.insertDraftSubmission(dbDraftSubmission)
if (insertResult instanceof Error) {
    // in here, insertResult is an Error
    console.error("Issue creating draft submission", insertResult.message)
    ...
    probably return the error upward or whatever else you should do here...
}

// now the compiler knows that our result is not an error:
const draft: DraftSubmissionType = insertResult

console.info("Created draft with ID:", draft.id)
...
```

The only exception to this is when using a library that requires the use of thrown errors. For example, our GraphQL library, Apollo, uses thrown errors to set the error response in a GraphQL resolver. We throw the expected errors, there.

### `throw + try {} catch`

Typescript allows for error control flow via the `throw` and `try/catch` syntax. This is especially commonly used with promises. Errors thrown inside of a promise will result the the promise being rejected with that error.

The trouble with relying on this for control flow is that the typescript compiler does not require you to call functions that can error inside of a `try {}` block, nor does it set the type of the error in your `catch (e) {}` block. That means that it is very easy to write code that looks fine but is not handling any error cases.

### neverthrow

[neverthrow](https://github.com/supermacro/neverthrow) is a package that adds a Result type to typescript. (this Result type has the same semantics as the Result type in Rust, which is based on the common functional concept of the Either type) The result type takes two type parameters for the Success type and the Error type. Results must be inspected with .isErr() or .isSuccess() before the .error or .result are used.

This ends up looking a lot like our chose option, but with an extra package involved. I think we can get mostly all the benefits of neverthrow just by using union types. We lose some of the result chaining niceties but we haven't felt that to be painful yet, so not worth the overhead of learning another type.

## Chosen Decision: Return Unioned Error types

Functions that can error should return their success type unioned with the Error type. This lets us rely on the compiler in all of our calling code to ensure that we handle errors in some way. All third party dependencies that can throw errors should be wrapped in functions that follow these guidelines.

The only exception to this is when using a library that requires the use of thrown errors. For example, our GraphQL library, Apollo, uses thrown errors to set the error response in a GraphQL resolver. We throw the expected errors, there, as control flow.

### Pro/Cons

#### return their success type unioned with the Error type

-   `+` the compiler enforces that you handle errors if you try and use the result of a function that can error
-   `+` union types are very commonly used typescript syntax
-   `+` the type signature makes it clear that an error may occur when calling the function
-   `–` throwing is common JavaScript practice, we will have to be careful to catch errors that can be thrown by the third party libraries we use

#### `throw + try {} catch`

-   `+` commonly used error handling pattern across typescript packages
-   `+` obvious separation of code on the golden path from the error path
-   `+` you can combine multiple erring calls in a single try {} block and catch all possible errors afterwards.
-   `–` no way for the compiler to enforce that possible errors are tried and caught
-   `–` caught errors are typed any and now unknown, there's no way to enforce the types of caught errors

#### neverthrow

-   `+` the compiler enforces that you handle errors if you try and use the result of a function that can error
-   `+` Result niceties allow for chaining calls that can error
-   `–` the result package is another dependency to learn, and is not commonly used
