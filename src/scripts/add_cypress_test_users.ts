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

async function createUser({
    userPoolID,
    name,
    email,
    role,
    state,
}: {
    userPoolID: string
    name: string
    email: string
    role: string
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
                Name: 'family_name' /* required */,
                Value: 'TestLastName',
            },
            {
                Name: 'email' /* required */,
                Value: email,
            },
            {
                Name: 'custom:role' /* required */,
                Value: role,
            },
            {
                Name: 'custom:state_code' /* required */,
                Value: state,
            },
        ],
    }

    const createdUser = await cognito.adminCreateUser(userProps).promise()
    console.log('CRESTed USer', createdUser)

    var passwordParams = {
        Password: 'STRING_VALUE',
        UserPoolId: userPoolID,
        Username: email,
        Permanent: true,
    }

    await cognito.adminSetUserPassword(passwordParams).promise()
}

async function main() {
    console.log('Main Execute')

    const stageName = process.argv[2]

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

    const userName = 'Aang'
    const userEmail = 'aang@dhs.state.mn.us'
    const userRole = 'STATE_USER'
    const userState = 'MN'

    try {
        await createUser({
            userPoolID,
            name: userName,
            email: userEmail,
            role: userRole,
            state: userState,
        })
    } catch (e) {
        console.log('Error creating user: ', e)
        process.exit(1)
    }

    console.log('FIN')
    process.exit(99)
}

main()
