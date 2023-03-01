import { spawn } from 'child_process'
import { requireBinary, checkURLIsUp } from '../deps.js'

function checkUploadsDeps() {
    const helpString =
        'ClamAV must be installed and in $PATH in order to test uploads. You can install with `brew install clamav`'

    requireBinary(['command', '-v', 'clamscan'], helpString)

    requireBinary(['command', '-v', 'freshclam'], helpString)
}

async function checkUploadsRunning() {
    // check to see if s3 is running locally on the default serverless-s3-local port
    // that is required for these tests to work.
    const isUp = await checkURLIsUp('http://localhost:4569')
    if (!isUp) {
        console.info(
            'in order to run the uploads tests, you must also be running the uploads service. `./dev local uploads` will do the trick'
        )
        process.exit(2)
    }
}

export async function runUploadsTestWatch(jestArgs: string[]) {
    checkUploadsDeps()

    await checkUploadsRunning()

    // because we are inheriting stdio for this process,
    // we need to not run spawnSync or else all the output
    // will be swallowed
    const proc = spawn('yarn', ['test'].concat(jestArgs), {
        cwd: 'services/uploads',
        stdio: 'inherit',
    })

    proc.on('close', (code) => {
        process.exit(code ? code : 0)
    })
}
