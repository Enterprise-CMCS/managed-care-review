import {
    checkAWSAccess,
    describeInstance,
    getSecretsForRDS,
    startInstance,
    stopInstance,
} from './aws.js'
import { retry } from './retry.js'
import { Instance } from '@aws-sdk/client-ec2'
import { execSync, spawn, spawnSync } from 'child_process'
import { writeFileSync, unlinkSync, existsSync } from 'fs'

function stageForEnv(env: string): string {
    // CDK uses consistent naming: dev, val, prod
    // Old serverless used "main" for dev, but CDK uses "dev"
    return env
}

// waitForJumpboxToReachState repeatedly checks the ec2 instance to be in the given state or times out
async function waitForJumpboxToReachState(
    instanceID: string,
    instanceStateCode: number
): Promise<undefined | Error> {
    const stoppedResult = await retry(async () => {
        try {
            const instance = await describeInstance({
                Filters: [
                    {
                        Name: 'instance-id',
                        Values: [instanceID],
                    },
                ],
            })
            if (instance instanceof Error) {
                console.error('Error describing instance', instance)
                return instance
            }

            const state = instance.State?.Code

            if (state === undefined) {
                return new Error('didnt get state back for the instance')
            }

            process.stdout.write('.')

            if (state === instanceStateCode) {
                return true
            }
        } catch (err) {
            return err
        }

        return false
    }, 60 * 1000) // 60 second timeout
    if (stoppedResult instanceof Error) {
        return stoppedResult
    }
    return undefined
}

// ensureBastionIsRunning gets the bastion Instance and if it's not running it starts it
// Now looks for CDK-managed bastion instead of old serverless jumpbox
async function ensureBastionIsRunning(
    stage: string
): Promise<Instance | Error> {
    const instance = await describeInstance({
        Filters: [
            {
                Name: 'tag:Name',
                Values: [`postgres-${stage}-bastion`],
            },
            {
                Name: 'tag:ManagedBy',
                Values: ['CDK'],
            },
            {
                // Only find instances that aren't terminated or terminating
                Name: 'instance-state-name',
                Values: ['pending', 'running', 'stopping', 'stopped'],
            },
        ],
    })
    if (instance instanceof Error) {
        return instance
    }

    const bastionInstance = instance

    const bastionID = bastionInstance.InstanceId
    const bastionState = bastionInstance.State?.Code

    if (!bastionID || bastionState === undefined) {
        return new Error(
            `AWS didn't return info we needed. id: ${bastionID} state: ${bastionState}`
        )
    }

    if (bastionState === 16) {
        // running state code
        console.info('Bastion is running')
        return bastionInstance
    }

    console.info('Bastion is not running', bastionInstance.State?.Name)

    if (bastionState !== 80) {
        console.info('Bastion is not stopped yet. waiting to start it')
        // wait for it to be stopped
        const stopped = await waitForJumpboxToReachState(bastionID, 80) // 80 is stopped
        if (stopped instanceof Error) {
            return stopped
        }
        console.info('Bastion Stopped')
    }

    console.info('Starting Bastion')
    // issue the start command
    const startResult = await startInstance(bastionID)
    if (startResult instanceof Error) {
        return startResult
    }

    const started = await waitForJumpboxToReachState(bastionID, 16) // 16 is running
    if (started instanceof Error) {
        return started
    }

    console.info('Bastion Started')

    const startedInstance = await describeInstance({
        Filters: [
            {
                Name: 'instance-id',
                Values: [bastionID],
            },
        ],
    })
    if (startedInstance instanceof Error) {
        console.error('error fetching restarted bastion', startedInstance)
        return startedInstance
    }

    return startedInstance
}

// Check if Docker is available and running
function checkDockerAvailable(): void {
    // First check if Docker CLI is installed
    try {
        execSync('docker --version', { stdio: 'ignore' })
    } catch {
        console.error('\n❌ Docker is required but not found on your system.')
        console.error('\nPlease install Docker Desktop:')
        console.error(
            '  Mac: https://docs.docker.com/desktop/install/mac-install/'
        )
        console.error(
            '  Windows: https://docs.docker.com/desktop/install/windows-install/'
        )
        console.error(
            '  Linux: https://docs.docker.com/desktop/install/linux-install/'
        )
        console.error(
            '\nAfter installing Docker, restart your terminal and try again.'
        )
        process.exit(1)
    }

    // Check if Docker daemon is running
    try {
        execSync('docker ps', { stdio: 'ignore' })
    } catch {
        console.error(
            '\n❌ Docker is installed but the Docker daemon is not running.'
        )
        console.error('\nPlease start Docker Desktop and try again.')
        console.error('  Mac/Windows: Open Docker Desktop application')
        console.error('  Linux: Run `sudo systemctl start docker`')
        process.exit(1)
    }
}

// Wait for SSM agent to be ready
async function waitForSSMAgent(instanceID: string): Promise<void> {
    console.info('Waiting for SSM agent to be ready...')
    await new Promise((resolve) => setTimeout(resolve, 10000)) // Wait 10 seconds for SSM agent
    console.info('SSM agent should be ready')
}

// Run pg_dump locally via Docker through SSM port forwarding tunnel
async function runPgDumpViaDocker(
    instanceID: string,
    dbSecrets: {
        host: string
        user: string
        port: number
        dbname: string
        password: string
    },
    dumpFileName: string
): Promise<void> {
    const localPort = 5433 // Use a local port that's unlikely to conflict

    console.info('Setting up SSM port forwarding tunnel to database...')

    // Start SSM port forwarding session in the background
    const ssmProcess = spawn(
        'aws',
        [
            'ssm',
            'start-session',
            '--target',
            instanceID,
            '--document-name',
            'AWS-StartPortForwardingSessionToRemoteHost',
            '--parameters',
            JSON.stringify({
                host: [dbSecrets.host],
                portNumber: [dbSecrets.port.toString()],
                localPortNumber: [localPort.toString()],
            }),
        ],
        {
            stdio: ['ignore', 'pipe', 'pipe'],
        }
    )

    // Handle SSM process errors
    let ssmError: Error | undefined
    ssmProcess.on('error', (err) => {
        ssmError = err
        console.error('SSM process error:', err.message)
    })

    // Also capture stderr for debugging
    let ssmStderr = ''
    ssmProcess.stderr?.on('data', (data) => {
        ssmStderr += data.toString()
    })

    // Wait for the tunnel to be established
    console.info('Waiting for tunnel to establish...')
    await new Promise((resolve) => setTimeout(resolve, 5000))

    const pgpassFile = '.pgpass.tmp'

    try {
        // Check if SSM process failed to start
        if (ssmError) {
            const errorMsg = ssmStderr
                ? `Failed to start SSM session: ${ssmError.message}\n${ssmStderr}`
                : `Failed to start SSM session: ${ssmError.message}`
            throw new Error(errorMsg)
        }

        // Check if SSM session encountered errors during startup
        if (ssmStderr.includes('error') || ssmStderr.includes('failed')) {
            console.warn('SSM session may have issues:', ssmStderr.trim())
        }

        console.info('Running pg_dump via Docker with PostgreSQL 16 client...')

        // Determine platform for Docker networking
        const isLinux = process.platform === 'linux'
        const dbHost = isLinux ? 'localhost' : 'host.docker.internal'

        // Create a temporary .pgpass file for authentication
        const pgpassContent = `${dbHost}:${localPort}:${dbSecrets.dbname}:${dbSecrets.user}:${dbSecrets.password}\n`
        writeFileSync(pgpassFile, pgpassContent, { mode: 0o600 })

        const dockerArgs = [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/dump`,
            '-v',
            `${process.cwd()}/${pgpassFile}:/root/.pgpass:ro`,
            ...(isLinux ? ['--network', 'host'] : []),
            'postgres:16-alpine',
            'pg_dump',
            '-Fc',
            '-h',
            dbHost,
            '-p',
            localPort.toString(),
            '-U',
            dbSecrets.user,
            '-d',
            dbSecrets.dbname,
            '-f',
            `/dump/${dumpFileName}`,
        ]

        console.info('This may take a few minutes for large databases...')

        const result = spawnSync('docker', dockerArgs, {
            stdio: 'inherit',
        })

        if (result.error) {
            throw result.error
        }

        if (result.status !== 0) {
            throw new Error(
                `Docker command failed with exit code ${result.status}`
            )
        }

        console.info(`✓ Database dump saved to: ${dumpFileName}`)
    } finally {
        // Clean up .pgpass file
        try {
            if (existsSync(pgpassFile)) {
                unlinkSync(pgpassFile)
            }
        } catch {
            // Ignore cleanup errors
            console.warn('Warning: Failed to clean up temporary .pgpass file')
        }

        // Clean up SSM session
        console.info('Closing SSM tunnel...')
        ssmProcess.kill()
        await new Promise((resolve) => setTimeout(resolve, 1000))
    }
}

async function cloneDBLocally(
    envName: string,
    _sshKeyPath: string, // Deprecated - kept for backwards compatibility
    stopAfter = true
) {
    // Check Docker is available first
    checkDockerAvailable()

    const check = await checkAWSAccess(envName)
    if (check instanceof Error) {
        process.exit(1)
    }

    const stage = stageForEnv(envName)

    // Figure out if bastion is running
    const instance = await ensureBastionIsRunning(stage)
    if (instance instanceof Error) {
        console.error('Error getting bastion running', instance)
        process.exit(1)
    }

    const bastionInstance = instance
    const bastionInstanceID = bastionInstance.InstanceId

    if (!bastionInstanceID) {
        console.error(
            'EC2 didnt return required information',
            bastionInstanceID
        )
        process.exit(1)
    }

    // Wait for SSM agent to be ready
    await waitForSSMAgent(bastionInstanceID)

    // Get the secrets for the DB.
    const dbSecrets = await getSecretsForRDS(stage)
    if (dbSecrets instanceof Error) {
        console.error('error fetching secrets', dbSecrets)
        process.exit(1)
    }

    try {
        // Create the filename for this db dump
        const now = new Date()
        const timeStamp = `${now.getFullYear()}${(now.getMonth() + 1)
            .toString()
            .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now
            .getHours()
            .toString()
            .padStart(2, '0')}${now
            .getMinutes()
            .toString()
            .padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`
        const dumpFileName = `dbdump-${envName}-${timeStamp}.sqlfc`

        // Run pg_dump locally via Docker through SSM port forwarding
        await runPgDumpViaDocker(bastionInstanceID, dbSecrets, dumpFileName)
    } catch (err) {
        console.error('Database dump failed', err)
        process.exit(1)
    }

    // Stop bastion
    if (stopAfter) {
        const stopRes = await stopInstance(bastionInstanceID)
        if (stopRes instanceof Error) {
            console.error('Stopping instance failed', stopRes)
            process.exit(1)
        }
        console.info('Stopped bastion')
    }

    process.exit(0)
}

export { cloneDBLocally }
