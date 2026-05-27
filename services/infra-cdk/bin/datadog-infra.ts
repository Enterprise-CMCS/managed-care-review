import { AppConfigLoader } from '../lib/config/app'
import { DatadogInfra } from '../lib/stacks/datadog-infra'
import { getEnvironment, getCdkEnvironment } from '../lib/config/environments'
import { ResourceNames } from '../lib/config/shared'
import { App, DefaultStackSynthesizer, Tags } from 'aws-cdk-lib'

function main(): void {
    try {
        const appConfig = AppConfigLoader.load()

        const app = new App({
            defaultStackSynthesizer: new DefaultStackSynthesizer({
                qualifier: 'mcreview',
            }),
        })

        app.node.setContext('stage', appConfig.stage)

        const config = getEnvironment(appConfig.stage)
        const env = getCdkEnvironment(appConfig.stage)

        new DatadogInfra(
            app,
            ResourceNames.stackName('datadog-infra', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'datadog-infra',
            }
        )

        Tags.of(app).add('Project', 'mc-review')
        Tags.of(app).add('Environment', appConfig.stage)
        Tags.of(app).add('ManagedBy', 'CDK')
        Tags.of(app).add(
            'Repository',
            'https://github.com/Enterprise-CMCS/managed-care-review'
        )

        app.synth()

        console.info(
            `CDK synthesis completed for DatadogInfra stack: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('DatadogInfra stack initialization failed:', error)
        console.error('\nTroubleshooting:')
        console.error('- Check AWS credentials and region configuration')
        process.exit(1)
    }
}

main()
