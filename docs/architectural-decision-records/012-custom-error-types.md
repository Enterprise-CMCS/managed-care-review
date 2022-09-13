# 012 — Custom Error Types

_a rose by any other name would smell as sweet_

Our code can error. Code in our dependencies can error. We want our error handling to be as simple and precise as possible. We also want to keep the errors that our dependencies can return or throw (which we don't ultimately control) constrained in the packages that wrap them, instead returning specific errors that we do control. (the reasoning behind domain models applies to errors as well) So we will want to return errors of some kind, this ADR covers what kind.

## Considered Options

### Create custom error classes that extend the Error class

This seems like the most obviously correct option and the one I've seen most commonly across our dependencies. Create custom error classes that inherit from Error. This gives you instanceof checking and allows you to keep the backtrace from where the error was instantiated.

### Return new Errors everywhere we can error

This is the simplest option, but without a "code" of some kind, we are going to end up not being able to do any reliable switching on the error in code. We'll get useful messages but not something we'd feel comfortable testing against.

### Return the same errors that our dependencies throw or return

Here we would just pass errors up without inserting ourselves. For errors arising from our own code we could do either of the above options.

## Chosen Decision: Return errors that extend Error

This decision mostly came down to how clean it is to use `instanceof` to type-discriminate on Error subclasses at runtime. By using custom Error classes, we can take advantage of the existing js infrastructure around errors and still ensure that the errors we return can be easily differentiated.

Our custom errors will be typescript classes because JavaScript Errors are classes and we want to be sure to look like an Error at runtime. So a custom error will look like this:

```
class StoreError extends Error {

    constructor(message: string) {
        super(message);

        // Set the prototype explicitly.
        // this makes `instanceof` work correctly
        Object.setPrototypeOf(this, FooError.prototype);
    }

}
```

Note the setPrototypeOf call which is due to [this strange typescript behavior](https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work). We need to set that to ensure that customErr instanceof Error works correctly for us.

Crucially, we will require that our custom errors have a "code" member, which will be set to a string constant. This code is meant to be how we will determine how to respond to a given error in code. The message may then continue to be human readable and subject to change.

Handling code will then have a couple different ways to switch on errors.

```
const insertResult = await store.insertDraftSubmission(dbDraftSubmission)
if (draftSubResult instanceof Error) {
    console.error("If the caller doesn't care about types of errors, just check Error")
    ...
}
```

```
const insertResult = await store.insertDraftSubmission(dbDraftSubmission)
if (draftSubResult instanceof StoreError) {
    console.error("now we might be able to get more info out of the error if we included it")
    console.error(draftSubResult.dbStream)
} else if (draftSubResult instanceof ProtoError) {
    console.error("maybe we do something different with a ProtoError.")
    console.error("but usually, a package should only return a single type of error.")
}
```

```
// this will be the most common switching case, I think.
const insertResult = await store.insertDraftSubmission(dbDraftSubmission)
if (insertResult instanceof StoreError) {
    if (insertResult.code === 'CONNECTION_ERROR') {
        console.error("with .code, we can handle different errors differently")
        ...
    } else if (insertResult.code === 'INVALID_SUBMISSION') {
        console.error("maybe now we return a 400 instead of a 500")
        ...
    } else if (insertResult.code === 'UNKNOWN') {
        console.error("OK that's definitely a 500")
        ...
    }
}
```

N.B. If it’s a simple case and there isn’t any reason you would think the caller would need to switch on different types of errors, then it can make sense to just return a new Error() instead. That can be turned into a more descriptive error in the future if we find we do need it. Since the new error will inherit from Error, code calling `err instanceof Error` will continue to work without modification.

### Pro/Cons

#### Create custom error classes that extend the Error class

-   `+` Easy to test against in code with instanceof
-   `+` can be treated as a generic error in higher level code
-   `+` can have a custom code attribute for machine-switching
-   `–` is using a class, we've mostly avoided them in our codebase, but since Error is a class it seems like a good exception :p

#### Return new Errors everywhere we can error

-   `+` Errors have a stack trace associated with them at the point of creation
-   `+` Doesn’t require writing any additional types to return an error
-   `-` No machine readable field to set to switch on in handling code

#### Return the same errors that our dependencies throw or return

-   `+` Makes it easy to keep the context for the actual error that caused our issue
-   `-` If we have error cases that don’t come from our dependencies, we still need to solve this problem for ourselves
-   `-` If we are switching on errors coming from our dependencies, an update could change how our code behaves, (this is in opposition to us using domain models)
