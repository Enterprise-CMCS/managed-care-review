import { spawnSync } from 'child_process'
import LabeledProcessRunner from '../runner.js'
import { requireBinary } from '../deps.js'

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

async function checkDockerInstalledAndRunning() {
    requireBinary(['docker'], 'Docker is required to run Cypress in a CI-like environment. Install Docker Desktop here: https://www.docker.com/products/docker-desktop')

    requireBinary(['docker', 'ps'], 'Docker must be running in order to continue. Please start Docker Desktop.')
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

    console.log('cyrpes args: ', cypressArgs)

    const runner = new LabeledProcessRunner()

    await buildCypressDockerImage(runner)

    // check to see if you're running ./dev local --for-docker

    // invoke docker command: docker run -v "$(pwd)":/mc-review --workdir /mc-review --env REACT_APP_AUTH_MODE=LOCAL b20d989f2035 /cypress/node_modules/.bin/cypress run --config baseUrl=http://host.docker.internal:3000 --spec tests/cypress/integration/stateSubmission.spec.ts

    await runner.runCommandAndOutput(
        'docker cypress',
        [
            'docker',
            'run',
            '-v', `${process.cwd()}:/mc-review`,
            '--workdir', '/mc-review',
            '--env', 'REACT_APP_AUTH_MODE=LOCAL',
            'gha-cypress:latest',

            '/cypress/node_modules/.bin/cypress',
            'run',
            '--config', 'baseUrl=http://host.docker.internal:3000',
            ...cypressArgs,
        ],
        '.'
    )

}
