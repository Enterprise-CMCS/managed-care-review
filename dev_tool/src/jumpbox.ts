import {
    addSSHWhitelistRuleToGroup,
    checkAWSAccess,
    describeInstance,
    describeSecurityGroup,
    getSecretsForRDS,
    startInstance,
    stopInstance,
} from './aws.js'
import { NodeSSH } from 'node-ssh'
import { retry } from './retry.js'
import { httpRequest } from './nodeWrappers.js'
import { Instance } from '@aws-sdk/client-ec2'

function stageForEnv(env: string): string {
    if (env === 'dev') {
        return 'main'
    }
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

// ensureJumpboxIsRunning gets the jumpbox Instance and if it's not running it starts it
async function ensureJumpboxIsRunning(): Promise<Instance | Error> {
    const instance = await describeInstance({
        Filters: [
            {
                Name: 'tag:mcr-vmuse',
                Values: ['jumpbox'],
            },
        ],
    })
    if (instance instanceof Error) {
        console.error('error fetching jumpbox', instance)
        return instance
    }

    const jumpboxStartInstance = instance

    const jumpboxStartID = jumpboxStartInstance.InstanceId
    const jumpboxStartState = jumpboxStartInstance.State?.Code

    if (!jumpboxStartID || jumpboxStartState === undefined) {
        return new Error(
            `AWS didn't return info we needed. id: ${jumpboxStartID} state: ${jumpboxStartState}`
        )
    }

    if (jumpboxStartState === 16) {
        // running state code
        console.info('Jumpbox is running')
        return jumpboxStartInstance
    }

    console.info('Jumpbox is not running', jumpboxStartInstance.State?.Name)

    if (jumpboxStartState !== 80) {
        console.info('Jumpbox is not stopped yet. waiting to start it')
        // wait for it to be running
        const stopped = await waitForJumpboxToReachState(jumpboxStartID, 80) // 80 is stopped
        if (stopped instanceof Error) {
            return stopped
        }
        console.info('Jumpbox Stopped')
    }

    console.info('Starting Jumpbox')
    // issue the start command
    const startResult = await startInstance(jumpboxStartID)
    if (startResult instanceof Error) {
        return startResult
    }

    const started = await waitForJumpboxToReachState(jumpboxStartID, 16) // 16 is running
    if (started instanceof Error) {
        return started
    }

    console.info('Jumpbox Started')

    const startedInstance = await describeInstance({
        Filters: [
            {
                Name: 'instance-id',
                Values: [jumpboxStartID],
            },
        ],
    })
    if (startedInstance instanceof Error) {
        console.error('error fetching restarted jumpbox', startedInstance)
        return startedInstance
    }

    return startedInstance
}

async function ensureWhitelistIP(
    instance: Instance
): Promise<undefined | Error> {
    // get my IP address
    const myIPAddress = await httpRequest('http://ifconfig.me/ip')
    if (myIPAddress instanceof Error) {
        return myIPAddress
    }

    // find the security group we care about for this
    const securityGroupID = instance.SecurityGroups?.find((sg) =>
        sg.GroupName?.includes('PostgresVm')
    )
    if (!securityGroupID || securityGroupID.GroupId === undefined) {
        return new Error('No security groups on the instance to update')
    }

    // get the right rule, check if my IP is in it
    const securityGroup = await describeSecurityGroup(securityGroupID.GroupId)
    if (securityGroup instanceof Error) {
        return securityGroup
    }

    const port22Rules = securityGroup.IpPermissions?.find(
        (perm) => perm.FromPort === 22
    )
    if (!port22Rules) {
        return new Error(
            'Security Group does not have port 22 on it, this will probably need to be fixed by hand, contact @mcrd'
        )
    }

    const myRule = port22Rules.IpRanges?.find((range) =>
        range.CidrIp?.startsWith(myIPAddress)
    )
    if (myRule) {
        // if our IP is already whitelisted, we're good.
        console.info('Already Whitelisted')
        return undefined
    }

    // in this case, now we need to add our IP address.
    console.info('Whitelisting', myIPAddress)

    const result = await addSSHWhitelistRuleToGroup(
        securityGroupID.GroupId,
        myIPAddress
    )
    if (result instanceof Error) {
        return result
    }

    return undefined
}

async function cloneDBLocally(envName: string, stopAfter = true) {
    const check = await checkAWSAccess(envName)
    if (check instanceof Error) {
        process.exit(1)
    }

    // Figure out if Jumpbox is running
    const instance = await ensureJumpboxIsRunning()
    if (instance instanceof Error) {
        console.error('Error setting IP whitelist', instance)
        process.exit(1)
    }

    const whitelist = await ensureWhitelistIP(instance)
    if (whitelist instanceof Error) {
        console.error('Error setting IP whitelist', whitelist)
        process.exit(1)
    }

    const jumpboxInstance = instance

    const jumpboxIP = jumpboxInstance.PublicIpAddress
    const jumpboxInstanceID = jumpboxInstance.InstanceId

    if (!jumpboxIP || !jumpboxInstanceID) {
        console.error(
            'EC2 didnt return required information',
            jumpboxIP,
            jumpboxInstanceID
        )
        process.exit(1)
    }

    // Get the secrets for the DB.
    const dbSecrets = await getSecretsForRDS(stageForEnv(envName))
    if (dbSecrets instanceof Error) {
        console.error('error fetching secrets', dbSecrets)
        process.exit(1)
    }

    try {
        // start an SSH connection
        console.info('Connecting to ', jumpboxIP)
        const ssh = new NodeSSH()

        // If the jumpbox just started we often have the connection refused for ~10 seconds until it's really up.
        const connectionResult = await retry(async () => {
            try {
                await ssh.connect({
                    host: jumpboxIP,
                    username: 'ubuntu',
                    privateKeyPath: '/Users/macrae/.ssh/wml_jumpbox',
                })
                console.info('Connected')
                return true
            } catch (err) {
                if (err.code === 'ECONNREFUSED') {
                    process.stdout.write('.')
                    return false
                }
                return err
            }
        }, 60 * 1000)
        if (connectionResult instanceof Error) {
            console.error(
                'failed to connect to jumpbox over ssh',
                connectionResult
            )
            process.exit(1)
        }

        // create the filename for this db dump
        const now = new Date()
        const timeStamp = `${now.getFullYear()}${(now.getMonth() + 1)
            .toString()
            .padStart(
                2,
                '0'
            )}${now.getDate()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}`
        const thereDumpFileName = `${envName}-${timeStamp}.sqlfc`

        console.info('dumping db on the server')
        // `pg_dump -Fc -h $hostname -p $port -U $username -d $dbname > [prod]-[date].sqlfc`
        const pgDumpArgs = [
            '-Fc',
            '-h',
            dbSecrets.host,
            '-p',
            dbSecrets.port.toString(),
            '-U',
            dbSecrets.user,
            '-d',
            dbSecrets.dbname,
            '-f',
            thereDumpFileName,
        ]
        const result = await ssh.exec('pg_dump', pgDumpArgs, {
            stdin: dbSecrets.password, // pg_dump asks for the password on stdin so we pass it here
            stream: 'both', // This triggers a result response type, undocumented trash.
        })
        if (result.code !== 0) {
            console.error('PG Dump Failed on server.')
            console.error(result.stderr)
            process.exit(1)
        }

        await ssh.getFile(thereDumpFileName, thereDumpFileName)
        console.info('copied db locally')

        // remove the file on the server
        await ssh.exec('rm', [thereDumpFileName])
    } catch (err) {
        console.error('ssh failed out', err)
        process.exit(1)
    }

    // stop jumpbox
    if (stopAfter) {
        const stopRes = await stopInstance(jumpboxInstanceID)
        if (stopRes instanceof Error) {
            console.error('Stopping instance failed', stopRes)
            process.exit(1)
        }
        console.info('Stopped jumpbox')
    }

    process.exit(0)
}

export { cloneDBLocally }
