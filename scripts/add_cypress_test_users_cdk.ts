import {
    CognitoIdentityProviderClient,
    AdminCreateUserCommand,
    AdminCreateUserCommandInput,
    AdminSetUserPasswordCommand,
    AdminSetUserPasswordCommandInput,
    UserNotFoundException,
    UsernameExistsException,
    InvalidParameterException,
} from '@aws-sdk/client-cognito-identity-provider'
import {
    CloudFormationClient,
    DescribeStacksCommand,
    DescribeStacksCommandInput,
} from '@aws-sdk/client-cloudformation'

async function getCDKUserPoolID(stageName: string): Promise<string> {
    // CDK stack naming convention: cognito-{stage}-cdk
    const cognitoStackName = `cognito-${stageName}-cdk`

    const cfClient = new CloudFormationClient({ region: 'us-east-1' })
    const input: DescribeStacksCommandInput = {
        StackName: cognitoStackName,
    }
    const command = new DescribeStacksCommand(input)
    const response = await cfClient.send(command)

    if (response.Stacks === undefined) {
        throw new Error(`Could not find CDK stack of name ${cognitoStackName}`)
    }

    const userPoolID = response.Stacks[0].Outputs?.filter(
        (o) => o.OutputKey === 'UserPoolId'
    )[0].OutputValue

    if (userPoolID === undefined) {
        throw new Error(`No UserPoolID defined in CDK stack ${cognitoStackName}`)
    }

    return userPoolID
}

type UserRole = 'CMS_USER' | 'STATE_USER' | 'UNKNOWN_USER' | 'ADMIN_USER' | 'HELPDESK_USER' | 'BUSINESSOWNER_USER' | 'CMS_APPROVER_USER'

// these are the exact roles as they are set by IDM
function IDMRole(role: UserRole): string {
    switch (role) {
        case 'CMS_USER':
            return 'macmcrrs-cms-user'
        case 'STATE_USER':
            return 'macmcrrs-state-user'
        case 'ADMIN_USER':
            return 'macmcrrs-approver'
        case 'HELPDESK_USER':
            return 'macmcrrs-helpdesk'
        case 'BUSINESSOWNER_USER':
            return 'macmcrrs-bo'
        case 'CMS_APPROVER_USER':
            return 'macmcrrs-cms-approver'
        case 'UNKNOWN_USER':
            return 'foo-bar-user'
    }
}

async function createUser({
    userPoolID,
    name,
    familyName,
    email,
    role,
    password,
    state,
}: {
    userPoolID: string
    name: string
    email: string
    role: UserRole
    password: string
    state?: string
    familyName?: string
}) {
    const cognitoClient = new CognitoIdentityProviderClient({
        apiVersion: '2016-04-19',
        region: 'us-east-1',
    })

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
                Value: familyName ?? 'TestLastName',
            },
            {
                Name: 'email',
                Value: email,
            },
            {
                Name: 'custom:role',
                Value: IDMRole(role),
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

    // create the user
    try {
        const commandCreateUser = new AdminCreateUserCommand(userProps)
        await cognitoClient.send(commandCreateUser)
    } catch (e) {
        // swallow username exists errors. this script is meant to be run repeatedly.
        if (e instanceof UsernameExistsException) {
            console.info('User already exists in CDK Cognito. Continuing.')
        } else if (e instanceof InvalidParameterException) {
            throw new Error(`Invalid parameters on CDK Cognito User create: ${e}`)
        } else {
            console.info(`AWS Error: ${e}`)
        }
    }

    // once the user is created, set it's password
    try {
        let passwordParams: AdminSetUserPasswordCommandInput = {
            Password: password,
            UserPoolId: userPoolID,
            Username: email,
            Permanent: true,
        }
        const setPassCommand = new AdminSetUserPasswordCommand(passwordParams)
        await cognitoClient.send(setPassCommand)
    } catch (e) {
        switch (e) {
            case e instanceof UserNotFoundException:
                console.info(
                    'Could not find user. User does not exist in CDK Cognito.'
                )
                throw new Error(`AWS Error: ${e}`)
            default:
                throw new Error(`AWS Error: ${e}`)
        }
    }
}

async function main() {
    console.info('INFO: Create Test Users for CDK Cognito')

    const stageName = process.argv[2]
    const testUserPassword = process.argv[3]

    const excludedStages = ['main', 'val', 'prod']
    if (excludedStages.includes(stageName)) {
        console.info('ERROR: Will not set test cognito users in this stage')
        process.exit(1)
    }

    let userPoolID = ''
    try {
        userPoolID = await getCDKUserPoolID(stageName)
    } catch (e) {
        console.info('Error fetching CDK User Pool ID: ', e)
        process.exit(1)
    }

    console.info('INFO: Got CDK UserPoolID:', userPoolID)

    const testUsers = [
        {
            name: 'Aang',
            familyName: 'Avatar',
            email: 'aang@example.com',
            role: 'STATE_USER' as const,
            state: 'MN',
        },
        {
            name: 'Toph',
            familyName: 'Beifong',
            email: 'toph@example.com',
            role: 'STATE_USER' as const,
            state: 'VA',
        },
        {
            name: 'Toph',
            familyName: 'Beifong',
            email: 'toph2@example.com',
            role: 'STATE_USER' as const,
            state: 'FL',
        },
        {
            name: 'Zuko',
            familyName: 'Hotman',
            email: 'zuko@example.com',
            role: 'CMS_USER' as const,
            state: undefined,
        },
        {
            name: 'Roku',
            familyName: 'Hotman',
            email: 'roku@example.com',
            role: 'CMS_USER' as const,
            state: undefined,
        },
        {
            name: 'Izumi',
            familyName: 'Hotman',
            email: 'izumi@example.com',
            role: 'CMS_USER' as const,
            state: undefined,
        },
        {
            name: 'Cabbages',
            email: 'cabbages@example.com',
            role: 'UNKNOWN_USER' as const,
            state: undefined,
        },
        {
            name: 'Iroh',
            email: 'iroh@example.com',
            familyName: 'Uncle',
            role: 'ADMIN_USER' as const,
            state: undefined,
        },
        {
            name: 'Appa',
            familyName: 'Sky Bison',
            email: 'appa@example.com',
            role: 'HELPDESK_USER' as const,
            state: undefined,
        },
        {
            name: 'Shi Tong',
            familyName: 'Wan',
            email: 'shi-tong@example.com',
            role: 'BUSINESSOWNER_USER' as const,
            state: undefined,
        },
        {
            name: 'Azula',
            familyName: 'Hotman',
            email: 'azula@example.com',
            role: 'CMS_APPROVER_USER' as const,
            state: undefined,
        }
    ]


    for (const user of testUsers) {
        try {
            console.info('Creating User in CDK Cognito:', user.name)
            await createUser({
                userPoolID,
                name: user.name,
                familyName: user.familyName,
                email: user.email,
                role: user.role,
                password: testUserPassword,
                state: user.state,
            })
        } catch (e) {
            console.info('Error creating user in CDK Cognito: ', e)
            process.exit(1)
        }
    }

    console.info('INFO: Successfully created all test users in CDK Cognito')
}

main()