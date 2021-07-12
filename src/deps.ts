import { spawnSync } from 'child_process'

// once lets you wrap a function so that if you call the wrapper multiple times the
// wrapped function is only called once. This gives the ability to define a function as being
// required by multiple commands, but only to be run once if both commands are run at the same time
// lifted from https://stackoverflow.com/questions/58083588/typescript-generic-once-function
export const once = <A extends any[], R, T>(
    fn: (this: T, ...arg: A) => R
): ((this: T, ...arg: A) => R | undefined) => {
    let done = false
    return function (this: T, ...args: A) {
        return done ? void 0 : ((done = true), fn.apply(this, args))
    }
}

export function requireBinary(checkCmd: string[], helpText: string) {
    const result = spawnSync(checkCmd[0], checkCmd.slice(1))

    if (result.status !== 0) {
        console.log(helpText)
        process.exit(1)
    }
}
