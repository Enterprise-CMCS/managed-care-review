import AWS from 'aws-sdk'

console.log('FIlE LOAD')

async function getUserPoolID(stageName: string): Promise<string> {
    const uiAuthStackName = `ui-auth-${stageName}`

    const cf = new AWS.CloudFormation({
        apiVersion: '2016-04-19',
        region: 'us-east-1',
    })

    const describe = await cf
        .describeStacks({ StackName: uiAuthStackName })
        .promise()

    if (describe.Stacks === undefined) {
        throw new Error('got back nothing')
    }

    const userPoolID = describe.Stacks[0].Outputs?.filter(
        (o) => o.OutputKey === 'UserPoolId'
    )[0].OutputValue

    if (userPoolID === undefined) {
        throw new Error(`No UserPoolID defined in ${uiAuthStackName}`)
    }

    return userPoolID
}

type UserRole = 'CMS_USER' | 'STATE_USER'

// these are the exact roles as they are set by IDM
function IDMRole(role: UserRole): string {
    switch (role) {
        case 'CMS_USER':
            return 'macmcrrs-cms-user'
        case 'STATE_USER':
            return 'macmcrrs-state-user'
    }
}

async function createUser({
    userPoolID,
    name,
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
}) {
    const cognito = new AWS.CognitoIdentityServiceProvider({
        apiVersion: '2016-04-19',
        region: 'us-east-1',
    })

    var userProps = {
        UserPoolId: userPoolID,
        Username: email,
        MessageAction: 'SUPPRESS',
        //TemporaryPassword: 'Password!1',
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
        ],
    }

    // only set state for STATE_USERS
    if (state) {
        userProps.UserAttributes.push({
            Name: 'custom:state_code',
            Value: state,
        })
    }

    try {
        const createdUser = await cognito.adminCreateUser(userProps).promise()
        console.log('CRESTed USer', createdUser)
    } catch (e) {
        // swallow username exists errors. this script is meant to be run repeatedly.
        if (e.code !== 'UsernameExistsException') {
            throw e
        }
    }

    var passwordParams = {
        Password: password,
        UserPoolId: userPoolID,
        Username: email,
        Permanent: true,
    }

    await cognito.adminSetUserPassword(passwordParams).promise()
}

async function main() {
    console.log('Main Execute')

    const stageName = process.argv[2]
    const testUserPassword = process.argv[3]

    console.log('SATEG', stageName)

    const excludedStages = ['main', 'val', 'prod']
    if (excludedStages.includes(stageName)) {
        console.log('ERROR: Will not set test cognito users in this stage')
        process.exit(1)
    }

    let userPoolID = ''
    try {
        userPoolID = await getUserPoolID(stageName)
        console.log('THATS A USER', userPoolID)
    } catch (e) {
        console.log('Error fetching User Pool ID: ', e)
        process.exit(1)
    }

    console.log('INFO: Creating test users...')

    const testUsers = [
        {
            name: 'Aang',
            email: 'aang@dhs.state.mn.us',
            role: 'STATE_USER' as const,
            state: 'MN',
        },
        {
            name: 'Toph',
            email: 'toph@dmas.virginia.gov',
            role: 'STATE_USER' as const,
            state: 'VA',
        },
        {
            name: 'Zuko',
            email: 'zuko@cms.hhs.gov',
            role: 'CMS_USER' as const,
            state: undefined,
        },
    ]

    for (const user of testUsers) {
        try {
            await createUser({
                userPoolID,
                name: user.name,
                email: user.email,
                role: user.role,
                password: testUserPassword,
                state: user.state,
            })
        } catch (e) {
            console.log('Error creating user: ', e)
            process.exit(1)
        }
    }

    console.log('FIN')
    process.exit(99)
}

main()
