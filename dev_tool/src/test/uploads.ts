import { spawn } from 'child_process'
import { requireBinary } from '../deps.js'

function checkUploadsDeps() {
    const helpString =
        'ClamAV must be installed and in $PATH in order to test uploads. You can install with `brew install clamav`'

    requireBinary(['command', '-v', 'clamscan'], helpString)

    requireBinary(['command', '-v', 'freshclam'], helpString)
}

export async function runUploadsTestWatch(jestArgs: string[]) {
    checkUploadsDeps()

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
