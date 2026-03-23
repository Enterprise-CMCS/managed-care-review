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

export async function runLaunchDarklyLocally(runner: LabeledProcessRunner) {
    // Kill any existing process on the LaunchDarkly port before starting
    const serviceUrl = new URL(
        process.env.LOCAL_LD_SERVICE_URL || 'http://127.0.0.1:3031'
    )
    const port = parseInt(serviceUrl.port || '3031', 10)
    killProcessOnPort(port)

    // Build the React client
    await runner.runCommandAndOutput(
        'build launch-darkly',
        ['pnpm', 'build:client'],
        'services/local-launch-darkly'
    )

    // Run with nodemon for hot reload
    await runner.runCommandAndOutput(
        'launch-darkly',
        ['pnpm', 'exec', 'nodemon'],
        'services/local-launch-darkly',
        { awaitFor: 'Local LaunchDarkly running' }
    )

    // Only open Chrome if an app window for this URL isn't already open
    const url = serviceUrl.href
    if (!isChromeWindowOpen(url)) {
        exec(
            `open -na "Google Chrome" --args --app=${url} --window-size=650,750`
        )
    }
}
