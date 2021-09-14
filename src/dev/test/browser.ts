import { spawnSync } from 'child_process'
import LabeledProcessRunner from '../runner.js'
import { checkDockerInstalledAndRunning, checkURLIsUp } from '../deps.js'

export async function runBrowserTests(cypressArgs: string[]) {
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

async function buildCypressDockerImage(runner: LabeledProcessRunner) {
    await checkDockerInstalledAndRunning()

    // Docker caching means we can just run this every time for now.
    // But we could check to see if the current image is old and delete it in that case.
    return runner.runCommandAndOutput(
        'docker build',
        ['docker', 'build', '-t', 'gha-cypress:latest', '.'],
        'containers/gha-cypress'
    )
}

export async function runBrowserTestsInDocker(cypressArgs: string[]) {
    const runner = new LabeledProcessRunner()

    const buildResult = await buildCypressDockerImage(runner)
    if (buildResult !== 0) {
        console.log('ERROR: building the CI docker image failed')
        process.exit(buildResult)
    }

    // check to see if you're running ./dev local --for-docker
    const isUp = await checkURLIsUp('http://localhost:3005')
    if (!isUp) {
        console.log(
            'in order to run cypress in docker, you need to run the front end configured correctly for docker. Run `./dev local web --for-docker` before running cypress.'
        )
        process.exit(2)
    }

    const baseUrlArgs = ['--config', 'baseUrl=http://host.docker.internal:3005']
    let cypressCommandArgs = ['run'].concat(baseUrlArgs)
    if (cypressArgs.length > 0) {
        for (const arg of cypressArgs) {
            if (arg.startsWith('baseUrl')) {
                console.log(
                    'WARNING: you have passed baseUrl into cypress but we override that in order to talk to our local app-web'
                )
            }
        }

        cypressCommandArgs = cypressArgs.concat(baseUrlArgs)
    }

    await runner.runCommandAndOutput(
        'docker cypress',
        [
            'docker',
            'run',
            '-v',
            `${process.cwd()}:/mc-review`,
            '--workdir',
            '/mc-review',
            '--env',
            'REACT_APP_AUTH_MODE=LOCAL',
            'gha-cypress:latest',

            '/cypress/node_modules/.bin/cypress',

            ...cypressCommandArgs,
        ],
        '.'
    )
}
