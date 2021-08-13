import { spawnSync } from 'child_process'

export async function run_browser_tests(cypressArgs: string[]) {
    let args = ['open']
    if (cypressArgs.length > 0) {
        args = cypressArgs
    }

    args = ['cypress'].concat(args)

    console.log(`running: npx ${args.join(' ')}`)
    spawnSync('npx', args, {
        stdio: 'inherit',
    })
}
