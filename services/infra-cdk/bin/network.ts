import * as cdk from 'aws-cdk-lib'
import { AppConfigLoader } from '../lib/config/app'
import { SynthesizerConfigLoader } from '../lib/config/synthesizer'
import { Aspects } from 'aws-cdk-lib'
import { IamPathAspect } from '../lib/aspects/iam-path-aspects'
import { IamPermissionsBoundaryAspect } from '../lib/aspects/iam-permissions-boundary-aspects'
import { Network } from '../lib/stacks/network'
import { getEnvironment, getCdkEnvironment, ResourceNames } from '../lib/config'

async function main(): Promise<void> {
    try {
        // Load configuration
        const appConfig = AppConfigLoader.load()
        const synthesizerLoader = new SynthesizerConfigLoader(
            appConfig.awsRegion
        )
        const synthConfig = await synthesizerLoader.load()

        // Create CDK app
        const app = new cdk.App({
            defaultStackSynthesizer: new cdk.DefaultStackSynthesizer(
                synthConfig
            ),
        })

        // Set stage context
        app.node.setContext('stage', appConfig.stage)

        // Create only the Network stack
        const config = getEnvironment(appConfig.stage)
        const env = getCdkEnvironment(appConfig.stage)

        new Network(app, ResourceNames.stackName('Network', appConfig.stage), {
            env,
            stage: appConfig.stage,
            stageConfig: config,
            serviceName: 'network',
        })

        // Apply IAM aspects
        Aspects.of(app).add(new IamPathAspect(appConfig.iamPath))
        if (appConfig.permissionsBoundaryArn) {
            Aspects.of(app).add(
                new IamPermissionsBoundaryAspect(
                    appConfig.permissionsBoundaryArn
                )
            )
        }

        // Add resource tags
        cdk.Tags.of(app).add('Project', 'mc-review')
        cdk.Tags.of(app).add('Environment', appConfig.stage)
        cdk.Tags.of(app).add('ManagedBy', 'CDK')
        cdk.Tags.of(app).add(
            'Repository',
            'https://github.com/Enterprise-CMCS/managed-care-review'
        )

        app.synth()

        console.info(
            `CDK synthesis completed for Network stack: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('Network stack initialization failed:', error)
        console.error('\nTroubleshooting:')
        console.error(
            '- Check required environment variables: VPC_ID, SG_ID, SUBNET_*_ID'
        )
        console.error('- Check AWS credentials and region configuration')
        process.exit(1)
    }
}

void main()
