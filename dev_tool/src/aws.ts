import {
    CloudFrontClient,
    ListDistributionsCommand,
} from '@aws-sdk/client-cloudfront'
import {
    EC2Client,
    DescribeInstancesCommand,
    DescribeInstancesCommandInput,
    StopInstancesCommand,
    StartInstancesCommand,
    DescribeSecurityGroupsCommand,
    SecurityGroup,
    AuthorizeSecurityGroupIngressCommand,
    Instance,
} from '@aws-sdk/client-ec2'
import {
    SecretsManagerClient,
    ListSecretsCommand,
    GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager'

// deployment environments -> url mapping
const accountURLs: { [key: string]: string } = {
    dev: 'mc-review-dev.onemac.cms.gov', // DO NOT CHECK THIS IN YET
    val: 'mc-review-val.onemac.cms.gov',
    prod: 'mc-review.onemac.cms.gov',
}

// checkAWSAccess checks that the current creds are valid and for the requested environment
async function checkAWSAccess(envName: string): Promise<undefined | Error> {
    // Our environments will always have CloudFront distributions for the UI of the app
    // Let's fetch those and make sure we're in the right place.
    const client = new CloudFrontClient({ region: 'us-east-1' })
    const command = new ListDistributionsCommand({})

    try {
        const response = await client.send(command)

        // One of our cloudfront distributions will have an alias for this environment
        const thisDistributionAlias = accountURLs[envName]
        const found = response.DistributionList?.Items?.find((dist) =>
            dist.Aliases?.Items?.find(
                (alias) => alias === thisDistributionAlias
            )
        )

        if (!found) {
            console.info(
                `You are logged into the wrong account. Load credentials for ${envName} from CloudTamer`
            )
            return new Error('Wrong account')
        }
        return undefined
    } catch (e) {
        if (e.name === 'CredentialsProviderError') {
            console.info(
                'No AWS credentials found. Load current ones into your environment from CloudTamer'
            )
        } else if (e.Code === 'ExpiredToken') {
            console.info(
                'Your AWS credentials have expired. Load current ones into your environment from CloudTamer'
            )
        } else if (e.Code === 'InvalidClientTokenId') {
            console.info(
                'Your AWS credentials are wrong. Load current ones into your environment from CloudTamer'
            )
        } else {
            console.error('Unknown error returned by AWS call, update ./dev?')
            throw e
        }
        return e
    }
}

// describeSecurityGroup returns the single security group with this ID
async function describeSecurityGroup(
    groupID: string
): Promise<SecurityGroup | Error> {
    const ec2 = new EC2Client({ region: 'us-east-1' })
    const describeSGs = new DescribeSecurityGroupsCommand({
        Filters: [{ Name: 'group-id', Values: [groupID] }],
    })

    try {
        const instances = await ec2.send(describeSGs)

        if (instances.SecurityGroups?.length != 1) {
            return new Error(
                `didnt get back the expected secuirty group. found: ${instances.SecurityGroups?.length}`
            )
        }

        const securityGroup = instances.SecurityGroups[0]

        return securityGroup
    } catch (err) {
        return err
    }
}

// addAllowlistRuleToGroup adds an SSH Allowlist rule to the given groupID
async function addSSHAllowlistRuleToGroup(
    groupID: string,
    ipAddress: string
): Promise<undefined | Error> {
    const ec2 = new EC2Client({ region: 'us-east-1' })
    const addAllowlist = new AuthorizeSecurityGroupIngressCommand({
        CidrIp: ipAddress + '/32',
        FromPort: 22,
        IpProtocol: 'TCP',
        ToPort: 22,
        GroupId: groupID,
    })

    try {
        await ec2.send(addAllowlist)
        return undefined
    } catch (err) {
        return err
    }
}

// describeInstance returns a single instance that matches the query
async function describeInstance(
    input: DescribeInstancesCommandInput = {}
): Promise<Instance | Error> {
    const ec2 = new EC2Client({ region: 'us-east-1' })
    const describeInstances = new DescribeInstancesCommand(input)

    try {
        const instances = await ec2.send(describeInstances)

        if (
            instances.Reservations?.length !== 1 ||
            instances.Reservations[0].Instances?.length !== 1
        ) {
            return new Error('Did not find one and only one instance')
        }

        const instance = instances.Reservations[0].Instances[0]
        return instance
    } catch (err) {
        return err
    }
}

async function stopInstance(id: string) {
    const ec2 = new EC2Client({ region: 'us-east-1' })
    const cmd = new StopInstancesCommand({
        InstanceIds: [id],
    })

    try {
        await ec2.send(cmd)
    } catch (err) {
        return err
    }
    return undefined
}

async function startInstance(id: string) {
    const ec2 = new EC2Client({ region: 'us-east-1' })

    const cmd = new StartInstancesCommand({
        InstanceIds: [id],
    })

    try {
        await ec2.send(cmd)
    } catch (err) {
        console.error('Error starting instance', err)
        return err
    }
}

interface DBConnection {
    host: string
    user: string
    port: number
    dbname: string
    password: string
}

async function getSecretsForRDS(stage: string): Promise<DBConnection | Error> {
    const client = new SecretsManagerClient({ region: 'us-east-1' })
    const SMName = `aurora_postgres_${stage}`

    const list = new ListSecretsCommand({
        Filters: [
            {
                Key: 'name',
                Values: [SMName],
            },
        ],
    })
    const secrets = await client.send(list)

    if (secrets.SecretList?.length !== 1) {
        throw new Error('Did not find one and only one secret on ' + stage)
    }

    const rdsSecret = secrets.SecretList[0]

    const getValue = new GetSecretValueCommand({
        SecretId: rdsSecret.ARN,
    })

    try {
        const secretValues = await client.send(getValue)

        if (!secretValues.SecretString) {
            return new Error('AWS didnt return a value for this secret')
        }

        const parsedSecrets = JSON.parse(secretValues.SecretString)

        return {
            host: parsedSecrets.host,
            user: parsedSecrets.username,
            port: parsedSecrets.port,
            dbname: parsedSecrets.dbname,
            password: parsedSecrets.password,
        }
    } catch (err) {
        if (err.__type === 'AccessDeniedException') {
            console.error(
                'These creds dont have the ability to get the RDS credentials. Log in with better creds.'
            )
            return err
        }
        return err
    }
}

export {
    checkAWSAccess,
    describeInstance,
    describeSecurityGroup,
    addSSHAllowlistRuleToGroup,
    getSecretsForRDS,
    stopInstance,
    startInstance,
}
