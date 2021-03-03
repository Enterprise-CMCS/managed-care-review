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
    let parsedFlags = Object.fromEntries(
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

// TODO: turn these into tests, but something is wonky about our dev testing setup. I think
// we might need webpack

// This code lets you take a set of user passed in binary flags from yargs and turns them into booleans
// So, for example, given a command to run your local environment that has a web frontend, an api, and a db:

// type localRunFlags = { runWeb: boolean; runAPI: boolean; runDB: boolean }
// function runLocalService(
//     testCase: string,
//     { runWeb, runAPI, runDB }: localRunFlags
// ) {
//     const runServices: string[] = []
//     runWeb && runServices.push('web')
//     runAPI && runServices.push('api')
//     runDB && runServices.push('db')

//     console.log(`${testCase}: running ${runServices.join(' ')}`)
// }

// // $ ./dev local --web --api --db  # this should run all three services at once
// const allInput = { runWeb: true, runAPI: true, runDB: true }
// const allFlags = parseRunFlags(allInput)

// runLocalService('allFlags', allFlags)

// // $ ./dev local   # if you don't pass anything, we also want to run everything
// const noneInput = { runWeb: undefined, runAPI: undefined, runDB: undefined }
// const noneFlags = parseRunFlags<localRunFlags>(noneInput)

// runLocalService('noneFlags', noneFlags)

// // $ ./dev local --api  # if you don't pass one, run it
// const anInput = { runWeb: undefined, runAPI: true, runDB: undefined }
// const aFlag = parseRunFlags<localRunFlags>(anInput)

// runLocalService('aFlag', aFlag)

// // $ ./dev local --api --db  # if you don't some, run them
// const someInput = { runWeb: undefined, runAPI: true, runDB: true }
// const someFlags = parseRunFlags<localRunFlags>(someInput)

// runLocalService('someFlags', someFlags)

// // $ ./dev local --no-db   # yargs also lets you invert booleans with --no, in that case run everything but the no
// const noDBInput = { runWeb: undefined, runAPI: undefined, runDB: false }
// const noDBFlags = parseRunFlags<localRunFlags>(noDBInput)

// runLocalService('noDBFlags', noDBFlags)

// // $ ./dev local --no-api --no-db   # yargs also lets you invert booleans with --no, in that case run everything but the no
// const nothingButNetInput = { runWeb: undefined, runAPI: false, runDB: false }
// const nothingButNetFlags = parseRunFlags<localRunFlags>(nothingButNetInput)

// runLocalService('nothingButNetFlags', nothingButNetFlags)

// // $ ./dev local --web --no-db   # if you mix and match flags, we don't know what to do with the rest of them.
// const mixMatchedFlags = { runWeb: true, runAPI: undefined, runDB: false }
// const mixMatchedFlags = parseRunFlags<localRunFlags>(nothingButNetInput)

// console.log('if you mix and match, you get: ', mixMatchedFlags)
