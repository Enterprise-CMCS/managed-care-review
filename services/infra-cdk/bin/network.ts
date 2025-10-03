import { App, Tags, Aspects, DefaultStackSynthesizer } from 'aws-cdk-lib'
import { AppConfigLoader } from '../lib/config/app'
import { IamPermissionsBoundaryAspect } from '../lib/aspects/iam-permissions-boundary-aspects'
import { Network } from '../lib/stacks/network'
import { getEnvironment, getCdkEnvironment, ResourceNames } from '../lib/config'

// Simplified version - using default synthesizer with mcreview qualifier
function main(): void {
    try {
        // Load configuration
        const appConfig = AppConfigLoader.load()

        // Create CDK app with mcreview qualifier
        const app = new App({
            defaultStackSynthesizer: new DefaultStackSynthesizer({
                qualifier: 'mcreview',
            }),
        })

        // Set stage context
        app.node.setContext('stage', appConfig.stage)

        // Create only the Network stack
        const config = getEnvironment(appConfig.stage)
        const env = getCdkEnvironment(appConfig.stage)

        new Network(app, ResourceNames.stackName('network', appConfig.stage), {
            env,
            stage: appConfig.stage,
            stageConfig: config,
            serviceName: 'network',
        })

        // Keep permissions boundary if still required by CMS
        if (appConfig.permissionsBoundaryArn) {
            Aspects.of(app).add(
                new IamPermissionsBoundaryAspect(
                    appConfig.permissionsBoundaryArn
                )
            )
        }

        // Add resource tags
        Tags.of(app).add('Project', 'mc-review')
        Tags.of(app).add('Environment', appConfig.stage)
        Tags.of(app).add('ManagedBy', 'CDK')
        Tags.of(app).add(
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

main()
