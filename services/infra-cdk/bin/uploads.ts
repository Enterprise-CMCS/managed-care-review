import { AppConfigLoader } from '../lib/config/app'
import { Uploads } from '../lib/stacks/uploads'
import { getEnvironment, getCdkEnvironment, ResourceNames } from '../lib/config'
import { App, DefaultStackSynthesizer, Tags } from 'aws-cdk-lib'

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

        // Get environment config
        const config = getEnvironment(appConfig.stage)
        const env = getCdkEnvironment(appConfig.stage)

        // Create Uploads stack (independent - no dependencies)
        new Uploads(app, ResourceNames.stackName('uploads', appConfig.stage), {
            env,
            stage: appConfig.stage,
            stageConfig: config,
            serviceName: 'uploads',
        })

        // Keep permissions boundary if still required by CMS

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
            `CDK synthesis completed for Uploads stack: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('Uploads stack initialization failed:', error)
        console.error('\nTroubleshooting:')
        console.error('- Check AWS credentials and region configuration')
        process.exit(1)
    }
}

main()
