import { spawnSync } from 'child_process'
import axios from 'axios'

// once lets you wrap a function so that if you call the wrapper multiple times the
// wrapped function is only called once. This gives the ability to define a function as being
// required by multiple commands, but only to be run once if both commands are run at the same time
// lifted from https://stackoverflow.com/questions/58083588/typescript-generic-once-function
export const once = <A extends unknown[], R, T>(
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
        console.info(helpText)
        process.exit(1)
    }
}

export function checkURLIsUp(url: string): Promise<boolean> {
    return axios.get(url, { timeout: 5000 })  // Add a timeout to prevent long waits
        .then(() => true)
        .catch(() => false)
}

export async function checkDockerInstalledAndRunning() {
    requireBinary(
        ['docker'],
        'Docker is required. Install Docker Desktop here: https://www.docker.com/products/docker-desktop'
    )

    requireBinary(
        ['docker', 'ps'],
        'Docker must be running in order to continue. Please start Docker Desktop.'
    )
}
