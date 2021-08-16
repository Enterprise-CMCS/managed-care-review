import { spawnSync } from 'child_process'

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

}

async function buildCypressDockerImage() {

    await checkDockerInstalledAndRunning()

    // see if the image exists
    // if not (or it's old?) docker build

}

export async function runBrowserTestsInDocker(cypressArgs: string[]) {

    console.log('cyrpes args: ', cypressArgs)

    await buildCypressDockerImage()

    // check to see if you're running ./dev local --for-docker

    // invoke docker command: docker run -v "$(pwd)":/mc-review --workdir /mc-review --env REACT_APP_AUTH_MODE=LOCAL b20d989f2035 /cypress/node_modules/.bin/cypress run --config baseUrl=http://host.docker.internal:3000 --spec tests/cypress/integration/stateSubmission.spec.ts


}
