import { spawnSync, SpawnSyncOptions } from 'child_process'

// function calls spawnSync, throws if anything other than 0 is the exit code. Trims and returns stdout
export function commandMustSucceedSync(
    cmd: string,
    args?: string[],
    opts?: SpawnSyncOptions
): string {
    const result = spawnSync(cmd, args, opts)
    if (result.status !== 0) {
        console.log(
            'stdout:',
            result.stderr.toString(),
            'stderr:',
            result.stdout.toString()
        )
        throw new Error(
            `an unexpected error occured attempting to run $ ${cmd} ${
                args ? args.join(' ') : ''
            }`
        )
    }
    return result.stdout.toString().trim()
}
