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

export async function runLaunchDarklyLocally(runner: LabeledProcessRunner) {
    // Install dependencies (excluded from workspace, so install separately)
    await runner.runCommandAndOutput(
        'ld install',
        ['pnpm', 'install'],
        'services/local-launch-darkly'
    )

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
    if (!isChromeWindowOpen('http://localhost:3031')) {
        exec(
            'open -na "Google Chrome" --args --app=http://localhost:3031 --window-size=650,750'
        )
    }
}
