// parseRunFlags takes in (boolean | undefined) flags that were set or not set from yargs and
// returns an object of booleans, with some logic about how to set the undefined ones depending
// on what you did set. So, for instance, if you pass no flags, we run everything. See the bottom of this file
// for examples,

// The types here are a bit complicated, but the upshot should be that you don't really need to worry about
// them when calling this. Make sure your function takes a flag object that is all {string: boolean} and this
// code should work fine and make sure you don't forget any.

// runFlags are objects with string keys and boolean values
// ex, for run_all_tests we have { runUnit: boolean; runOffline: boolean }
type runFlags = { [flag: string]: boolean }

// runFlagsInput are a representation of the flags the user actually sets
// When boolean flags come in from yargs, they are undefined if they are not set
// this is "type mapping" syntax. ugly.
type runFlagsInput<T> = { [P in keyof T]: T[P] | undefined }

// parseFlagSet converts the flags that come in from yargs into a strictly true/false set
// applying the rules where if you set none of them, we run all of them
export function parseRunFlags<T extends runFlags>(
    inputFlags: runFlagsInput<T>
): T | undefined {
    // given a dict { string: boolean | undefined }
    // if some are true and none are false, set undefineds to false: run only what is called
    // if some are false and none are true, set all the undefineds to true: run everything but what is not-called
    // if some are true and some are false and some are undefined, error "don't mix and match"
    // if all are specified, do nothing

    let anyTrue = false
    let anyFalse = false
    let anyUndefined = false

    for (const k in inputFlags) {
        if (inputFlags[k] !== undefined) {
            if (inputFlags[k]) {
                anyTrue = true
            } else {
                anyFalse = true
            }
        } else {
            anyUndefined = true
        }
    }

    if (anyTrue && anyFalse && anyUndefined) {
        // if you have tried to positively include some flags and negatively include other flags
        // and you have left some flags unset, we don't know how to interpret those unset flags
        // so we return undefined as an error.
        return undefined
    }

    // Sadly, `any` lives in here. The types in parseRunFlags's signature are right, but it's not clear to me how
    // to make typescript happy with actually mapping one type to another.
    // so we do the unsafe thing. Having the types in the signature is still a big win.
    const parsedFlags = Object.fromEntries(
        Object.entries(inputFlags).map(
            ([key, value]: [string, boolean | undefined]): [
                string,
                boolean
            ] => {
                if (value === undefined) {
                    return [key, !anyTrue]
                } else {
                    return [key, value]
                }
            }
        )
    )

    return parsedFlags as T
}
