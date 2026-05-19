import { exec, execSync } from 'child_process'
import LabeledProcessRunner from '../runner.js'

function isChromeWindowOpen(url: string): boolean {
    try {
        const result = execSync(
            `osascript -e 'tell application "Google Chrome" to get URL of every tab of every window'`,
            { encoding: 'utf-8' }
        )
        return result.includes(url)
    } catch {
        return false
    }
}

function killProcessOnPort(port: number): void {
    try {
        const pids = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf-8' })
            .trim()
            .split('\n')
            .filter(Boolean)

        for (const pid of pids) {
            console.info(`Killing existing process ${pid} on port ${port}`)
            process.kill(parseInt(pid, 10), 'SIGTERM')
        }
    } catch {
        // lsof returns non-zero if no process found — port is free
    }
}

export async function runLocalDevConsoleLocally(runner: LabeledProcessRunner) {
    const rawServiceUrl = process.env.LOCAL_DEV_SERVICE_URL
    if (!rawServiceUrl) {
        console.error(
            'LOCAL_DEV_SERVICE_URL is not set. Add it to .envrc and run `direnv allow`.'
        )
        process.exit(1)
    }
    // Kill any existing process on the dev console port before starting
    const serviceUrl = new URL(rawServiceUrl)
    const port = parseInt(serviceUrl.port || '3031', 10)
    killProcessOnPort(port)

    // Build the React client
    await runner.runCommandAndOutput(
        'build local-dev-console',
        ['pnpm', 'build:client'],
        'services/local-dev-console'
    )

    // Run with nodemon for hot reload
    await runner.runCommandAndOutput(
        'local-dev-console',
        ['pnpm', 'exec', 'nodemon'],
        'services/local-dev-console',
        { awaitFor: 'Local Dev Console running' }
    )

    // Only open Chrome if an app window for this URL isn't already open
    const url = serviceUrl.href
    if (!isChromeWindowOpen(url)) {
        exec(
            `open -na "Google Chrome" --args --app=${url} --window-size=1000,750`
        )
    }
}
