import {
    CognitoIdentityProviderClient,
    AdminCreateUserCommand,
    AdminCreateUserCommandInput,
    AdminSetUserPasswordCommand,
    AdminSetUserPasswordCommandInput,
} from '@aws-sdk/client-cognito-identity-provider'
import {
    CloudFormationClient,
    DescribeStacksCommand,
    DescribeStacksCommandInput,
} from '@aws-sdk/client-cloudformation'

async function getUserPoolID(stageName: string): Promise<string> {
    const uiAuthStackName = `ui-auth-${stageName}`

    const cfClient = new CloudFormationClient({ region: 'us-east-1' })
    const input: DescribeStacksCommandInput = {
        StackName: uiAuthStackName,
    }
    const command = new DescribeStacksCommand(input)
    const response = await cfClient.send(command)

    if (response.Stacks === undefined) {
        throw new Error(`Could not find stack of name ${uiAuthStackName}`)
    }

    const userPoolID = response.Stacks[0].Outputs?.filter(
        (o) => o.OutputKey === 'UserPoolId'
    )[0].OutputValue

    if (userPoolID === undefined) {
        throw new Error(`No UserPoolID defined in ${uiAuthStackName}`)
    }

    return userPoolID
}

type UserRole = 'CMS_USER' | 'STATE_USER' | 'UNKNOWN_USER'

// these are the exact roles as they are set by IDM
function IDMRole(role: UserRole): string {
    switch (role) {
        case 'CMS_USER':
            return 'macmcrrs-cms-user'
        case 'STATE_USER':
            return 'macmcrrs-state-user'
        case 'UNKNOWN_USER':
            return 'foo-bar-user'
    }
}

async function createUser({
    userPoolID,
    name,
    email,
    role,
    password,
    state,
    identities,
}: {
    userPoolID: string
    name: string
    email: string
    role: UserRole
    password: string
    state?: string
    identities: string
}) {
    const client = new CognitoIdentityProviderClient({ region: 'us-east-1' })

    let userProps: AdminCreateUserCommandInput = {
        UserPoolId: userPoolID,
        Username: email,
        MessageAction: 'SUPPRESS',
        DesiredDeliveryMediums: ['EMAIL'],
        UserAttributes: [
            {
                Name: 'given_name',
                Value: name,
            },
            {
                Name: 'family_name',
                Value: 'TestLastName',
            },
            {
                Name: 'email',
                Value: email,
            },
            {
                Name: 'custom:role',
                Value: IDMRole(role),
            },
            {
                Name: 'identities',
                Value: identities,
            },
        ],
    }

    // only set state for STATE_USERS
    if (state) {
        userProps.UserAttributes?.push({
            Name: 'custom:state_code',
            Value: state,
        })
    }

    try {
        const command = new AdminCreateUserCommand(userProps)
        await client.send(command)
    } catch (e) {
        // swallow username exists errors. this script is meant to be run repeatedly.
        // @ts-ignore-next-line err is unknown - we need a type assertion for AWSError type
        if (e.code && e.code !== 'UsernameExistsException') {
            throw new Error('AWS Error: ' + e)
        }
    }

    let passwordParams: AdminSetUserPasswordCommandInput = {
        Password: password,
        UserPoolId: userPoolID,
        Username: email,
        Permanent: true,
    }
    const setPassCommand = new AdminSetUserPasswordCommand(passwordParams)
    await client.send(setPassCommand)
}

async function main() {
    console.log('INFO: Create Test Users')

    const stageName = process.argv[2]
    const testUserPassword = process.argv[3]

    const excludedStages = ['main', 'val', 'prod']
    if (excludedStages.includes(stageName)) {
        console.log('ERROR: Will not set test cognito users in this stage')
        process.exit(1)
    }

    let userPoolID = ''
    try {
        userPoolID = await getUserPoolID(stageName)
    } catch (e) {
        console.log('Error fetching User Pool ID: ', e)
        process.exit(1)
    }

    console.log('INFO: Got UserPoolID')

    const testUsers = [
        {
            name: 'Aang',
            email: 'aang@example.com',
            role: 'STATE_USER' as const,
            state: 'MN',
            identities: '[{"userId": "AAAA"}]',
        },
        {
            name: 'Toph',
            email: 'toph@example.com',
            role: 'STATE_USER' as const,
            state: 'VA',
            identities: '[{"userId": "BBBB"}]',
        },
        {
            name: 'Zuko',
            email: 'zuko@example.com',
            role: 'CMS_USER' as const,
            state: undefined,
            identities: '[{"userId": "CCCC"}]',
        },
        {
            name: 'Cabbages',
            email: 'cabbages@example.com',
            role: 'UNKNOWN_USER' as const,
            state: undefined,
            identities: '[{"userId": "DDDD"}]',
        },
    ]

    for (const user of testUsers) {
        try {
            console.log('Creating User:', user.name)
            await createUser({
                userPoolID,
                name: user.name,
                email: user.email,
                role: user.role,
                password: testUserPassword,
                state: user.state,
                identities: user.identities,
            })
        } catch (e) {
            console.log('Error creating user: ', e)
            process.exit(1)
        }
    }
}

main()
