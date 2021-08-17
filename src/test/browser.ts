import { spawnSync } from 'child_process'
import LabeledProcessRunner from '../runner.js'
import { requireBinary, checkURLIsUp } from '../deps.js'

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

    const runner = new LabeledProcessRunner()

    await buildCypressDockerImage(runner)

    // check to see if you're running ./dev local --for-docker
    const isUp = await checkURLIsUp('http://localhost:3005')
    if (!isUp) {
        console.log('in order to run cypress in docker, you need to run the front end configured correctly for docker. Run `./dev local web --for-docker` before running cypress.')
        process.exit(2)
    }

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
            '--config', 'baseUrl=http://host.docker.internal:3005',
            ...cypressArgs,
        ],
        '.'
    )

}
