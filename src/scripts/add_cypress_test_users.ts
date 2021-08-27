import AWS from 'aws-sdk'
import { spawnSync } from 'child_process'

console.log('FIlE LOAD')

async function main() {
    console.log('Main Execute')

    const stageName = process.argv[2]

    console.log('SATEG', stageName)

    const excludedStages = ['main', 'val', 'prod']
    if (excludedStages.includes(stageName)) {
        console.log('ERROR: Will not set test cognito users in this stage')
        process.exit(1)
    }

    const cognito = new AWS.CognitoIdentityServiceProvider({
        apiVersion: '2016-04-19',
        region: 'us-east-1',
    })

    console.log('cong', cognito)

    const cf = new AWS.CloudFormation({
        apiVersion: '2016-04-19',
        region: 'us-east-1',
    })

    const describe = await cf.describeStacks({ StackName: 'ui-auth' }).promise()

    if (describe.Stacks === undefined) {
        throw new Error('got back nothing')
    }

    const myUsrplkeID = describe.Stacks[0].Outputs?.filter(
        (o) => o.OutputKey === 'UserPoolId'
    )[0].OutputValue

    console.log('USER POID', myUsrplkeID)

    console.log('INFO: Creating test users...')

    const userPoolProc = spawnSync('services/output.sh', [
        'services/ui-auth',
        'UserPoolId',
        stageName,
    ])

    if (userPoolProc.error) {
        throw userPoolProc.error
    }

    const userPoolID = userPoolProc.stdout

    // const foo: number = 4

    const userName = 'Aang'
    const userEmail = 'aang@dhs.state.mn.us'
    const userRole = 'STATE_USER'
    const userState = 'MN'

    var userProps = {
        UserPoolId: userPoolID,
        Username: userEmail,
        MessageAction: 'SUPPRESS',
        //TemporaryPassword: 'Password!1',
        DesiredDeliveryMediums: ['EMAIL'],
        UserAttributes: [
            {
                Name: 'given_name',
                Value: userName,
            },
            {
                Name: 'family_name' /* required */,
                Value: 'TestLastName',
            },
            {
                Name: 'email' /* required */,
                Value: userEmail,
            },
            {
                Name: 'custom:role' /* required */,
                Value: userRole,
            },
            {
                Name: 'custom:state_code' /* required */,
                Value: userState,
            },
        ],
    }

    const createUser = await cognito.adminCreateUser(userProps).promise()

    console.log('CRESTed USer', createUser)

    // console.log(Auth)

    console.log("I'm in NODE", stageName, userPoolProc.stdout.toString())
}

main()
