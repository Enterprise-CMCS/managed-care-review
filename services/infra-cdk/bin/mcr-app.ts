import { AppConfigLoader } from '../lib/config/app-config'
import { SynthesizerConfigLoader } from '../lib/config/synthesizer-config'
import { CdkAppFactory } from '../lib/app-factory'

async function main(): Promise<void> {
    try {
        // Load configuration
        const appConfig = AppConfigLoader.load()
        const synthesizerLoader = new SynthesizerConfigLoader(
            appConfig.awsRegion
        )
        const synthConfig = await synthesizerLoader.load()

        // Create and synthesize CDK app
        const app = await CdkAppFactory.create(appConfig, synthConfig)
        app.synth()

        console.info(`CDK synthesis completed for stage: ${appConfig.stage}`)
    } catch (error) {
        console.error('CDK app initialization failed:', error)
        console.error('\nTroubleshooting:')
        console.error('- Check AWS credentials and region configuration')
        console.error('- Ensure CDK bootstrap and proper AWS permissions')
        console.error(
            '- Verify STAGE_NAME or --context stage=<stage> is provided'
        )
        process.exit(1)
    }
}

await main()
