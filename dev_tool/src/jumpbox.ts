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
import { createConnection } from 'net'

function stageForEnv(env: string): string {
    // CDK uses consistent naming: dev, val, prod
    // Old serverless used "main" for dev, but CDK uses "dev"
    return env
}

// waitForBastionToReachState repeatedly checks the ec2 instance to be in the given state or times out
async function waitForBastionToReachState(
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
        const stopped = await waitForBastionToReachState(bastionID, 80) // 80 is stopped
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

    const started = await waitForBastionToReachState(bastionID, 16) // 16 is running
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

// Wait for SSM agent to be ready with proper health checks
async function waitForSSMAgent(instanceID: string): Promise<void> {
    console.info('Waiting for SSM agent to be ready...')
    let lastError: string | undefined
    let lastStatus: string | undefined

    const ssmReadyResult = await retry(async () => {
        try {
            // Check if the instance is registered and reachable via SSM
            const result = execSync(
                `aws ssm describe-instance-information --region us-east-1 --filters Key=InstanceIds,Values=${instanceID} --query "InstanceInformationList[0].PingStatus" --output text`,
                { stdio: 'pipe', encoding: 'utf-8' }
            )
            const status = result.trim()
            lastStatus = status

            // PingStatus should be "Online" when ready
            if (status === 'Online') {
                return true
            }
            // If we got a response but it's not Online, show what we got
            if (status && status !== 'None') {
                process.stdout.write(`[${status}]`)
            } else {
                process.stdout.write('.')
            }
            return false
        } catch (err) {
            // Capture error details for debugging
            if (err instanceof Error) {
                lastError = err.message
            } else if (typeof err === 'object' && err !== null) {
                // execSync errors include stderr in the error object
                const execError = err as { stderr?: Buffer; message?: string }
                lastError =
                    execError.stderr?.toString() ||
                    execError.message ||
                    String(err)
            }
            // SSM agent not ready yet; retry until timeout
            process.stdout.write('.')
            return false
        }
    }, 120 * 1000) // 120 second timeout - SSM agent can take time to register after instance starts

    if (ssmReadyResult instanceof Error) {
        console.error(
            '\nError: SSM agent did not become ready in time. The instance may need more time to start up and register with SSM.'
        )
        if (lastStatus) {
            console.error(`Last status received: ${lastStatus}`)
        }
        if (lastError) {
            console.error(`Last error: ${lastError}`)
        }
        console.error(`Instance ID: ${instanceID}`)
        console.error('\nTroubleshooting:')
        console.error(
            '  1. Check if the instance has the SSM agent installed and running'
        )
        console.error(
            '  2. Check if the instance has the AmazonSSMManagedInstanceCore IAM policy'
        )
        console.error(
            `  3. Run: aws ssm describe-instance-information --region us-east-1 --filters Key=InstanceIds,Values=${instanceID}`
        )
        throw ssmReadyResult
    }
    console.info('\nSSM agent is ready')
}

// Establish SSM port forwarding tunnel to the database
// Returns the SSM process which must be cleaned up by the caller
async function establishSSMTunnel(
    instanceID: string,
    host: string,
    port: number,
    localPort: number
): Promise<ReturnType<typeof spawn>> {
    console.info('Setting up SSM port forwarding tunnel to database...')

    // Start SSM port forwarding session in the background
    const ssmProcess = spawn(
        'aws',
        [
            'ssm',
            'start-session',
            '--region',
            'us-east-1',
            '--target',
            instanceID,
            '--document-name',
            'AWS-StartPortForwardingSessionToRemoteHost',
            '--parameters',
            JSON.stringify({
                host: [host],
                portNumber: [port.toString()],
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

    // Also capture stdout and stderr for debugging
    let ssmStdout = ''
    let ssmStderr = ''
    ssmProcess.stdout?.on('data', (data) => {
        ssmStdout += data.toString()
    })
    ssmProcess.stderr?.on('data', (data) => {
        ssmStderr += data.toString()
    })

    // Monitor process exit
    ssmProcess.on('exit', (code, signal) => {
        if (code !== null && code !== 0) {
            console.error(`\nSSM process exited with code ${code}`)
            if (ssmStderr) {
                console.error('stderr:', ssmStderr)
            }
        }
    })

    // Check if SSM process failed to start before attempting tunnel establishment
    if (ssmError) {
        const errorMsg = ssmStderr
            ? `Failed to start SSM session: ${ssmError.message}\n${ssmStderr}`
            : `Failed to start SSM session: ${ssmError.message}`
        throw new Error(errorMsg)
    }

    // Wait for the tunnel to be established with proper health check
    console.info('Waiting for tunnel to establish...')
    const tunnelReady = await retry(async () => {
        return new Promise<boolean>((resolve) => {
            const socket = createConnection(localPort, 'localhost')

            const timeout = setTimeout(() => {
                socket.removeAllListeners()
                socket.destroy()
                resolve(false)
            }, 1000)

            socket.on('connect', () => {
                clearTimeout(timeout)
                socket.removeAllListeners()
                socket.destroy()
                resolve(true)
            })
            socket.on('error', () => {
                clearTimeout(timeout)
                process.stdout.write('.')
                socket.removeAllListeners()
                socket.destroy()
                resolve(false)
            })
        })
    }, 30 * 1000) // 30 second timeout for tunnel

    if (tunnelReady instanceof Error) {
        console.error('\nFailed to establish SSM tunnel to database')
        if (ssmStderr) {
            console.error('SSM stderr:', ssmStderr)
        }
        if (ssmStdout) {
            console.error('SSM stdout:', ssmStdout)
        }
        if (ssmProcess.exitCode !== null) {
            console.error('SSM process exit code:', ssmProcess.exitCode)
        }
        throw new Error('Failed to establish SSM tunnel to database')
    }
    console.info('\nTunnel established')

    return ssmProcess
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

    // Establish the SSM tunnel
    const ssmProcess = await establishSSMTunnel(
        instanceID,
        dbSecrets.host,
        dbSecrets.port,
        localPort
    )

    try {
        console.info('Running pg_dump via Docker with PostgreSQL 16 client...')

        // Determine platform for Docker networking
        const isLinux = process.platform === 'linux'
        const dbHost = isLinux ? 'localhost' : 'host.docker.internal'

        const dockerArgs = [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/dump`,
            ...(isLinux ? ['--network', 'host'] : []),
            '-e',
            `PGPASSWORD=${dbSecrets.password}`,
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
        // Clean up SSM session
        // Check if process is still running before attempting to kill
        if (ssmProcess.exitCode === null && !ssmProcess.killed) {
            console.info('Closing SSM tunnel...')
            try {
                ssmProcess.kill()
                // Wait a moment for graceful shutdown
                await new Promise((resolve) => setTimeout(resolve, 1000))
            } catch (err) {
                console.warn(
                    'Warning: Failed to kill SSM process:',
                    err instanceof Error ? err.message : String(err)
                )
            }
        }
    }
}

async function cloneDBLocally(envName: string, stopAfter = true) {
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

// Run psql interactively via Docker through SSM port forwarding tunnel
async function runPsqlViaDocker(
    instanceID: string,
    dbSecrets: {
        host: string
        user: string
        port: number
        dbname: string
        password: string
    }
): Promise<void> {
    const localPort = 5433 // Use a local port that's unlikely to conflict

    // Establish the SSM tunnel
    const ssmProcess = await establishSSMTunnel(
        instanceID,
        dbSecrets.host,
        dbSecrets.port,
        localPort
    )

    try {
        console.info(
            'Starting interactive PostgreSQL session via Docker with PostgreSQL 16 client...'
        )
        console.info(
            `Connecting to database: ${dbSecrets.dbname} as user: ${dbSecrets.user}`
        )
        console.info('Type \\q or press Ctrl+D to exit the session\n')

        // Determine platform for Docker networking
        const isLinux = process.platform === 'linux'
        const dbHost = isLinux ? 'localhost' : 'host.docker.internal'

        // Use PGPASSWORD environment variable and run psql interactively
        const dockerArgs = [
            'run',
            '--rm',
            '-it', // Interactive terminal
            ...(isLinux ? ['--network', 'host'] : []),
            '-e',
            `PGPASSWORD=${dbSecrets.password}`,
            'postgres:16-alpine',
            'psql',
            '-h',
            dbHost,
            '-p',
            localPort.toString(),
            '-U',
            dbSecrets.user,
            '-d',
            dbSecrets.dbname,
        ]

        const result = spawnSync('docker', dockerArgs, {
            stdio: 'inherit',
        })

        if (result.error) {
            throw result.error
        }

        if (result.status !== 0 && result.status !== null) {
            // status null means killed by signal (e.g., Ctrl+C), which is normal
            throw new Error(
                `Docker command failed with exit code ${result.status}`
            )
        }

        console.info('\nPostgreSQL session ended')
    } finally {
        // Clean up SSM session
        // Check if process is still running before attempting to kill
        if (ssmProcess.exitCode === null && !ssmProcess.killed) {
            console.info('Closing SSM tunnel...')
            try {
                ssmProcess.kill()
                // Wait a moment for graceful shutdown
                await new Promise((resolve) => setTimeout(resolve, 1000))
            } catch (err) {
                console.warn(
                    'Warning: Failed to kill SSM process:',
                    err instanceof Error ? err.message : String(err)
                )
            }
        }
    }
}

async function connectToPostgres(envName: string, stopAfter = true) {
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
            "EC2 didn't return required information",
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
        // Run psql interactively via Docker through SSM port forwarding
        await runPsqlViaDocker(bastionInstanceID, dbSecrets)
    } catch (err) {
        console.error('PostgreSQL connection failed', err)
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

export { cloneDBLocally, connectToPostgres }
