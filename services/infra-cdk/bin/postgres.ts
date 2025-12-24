import { AppConfigLoader } from '../lib/config/app'
import { Postgres } from '../lib/stacks/postgres'
import { getEnvironment, getCdkEnvironment } from '../lib/config/environments'
import { ResourceNames } from '../lib/config/shared'
import { App, DefaultStackSynthesizer, Tags, Fn } from 'aws-cdk-lib'
import { Vpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2'

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

        // Network stack name for importing exports
        const networkStackName = ResourceNames.stackName(
            'network',
            appConfig.stage
        )

        // Import VPC from environment (same as Network stack does)
        const vpc = Vpc.fromLookup(app, 'ImportedVpc', {
            vpcId: process.env.VPC_ID!,
        })

        // Import security groups from Network stack CloudFormation exports
        const lambdaSecurityGroup = SecurityGroup.fromSecurityGroupId(
            app,
            'ImportedLambdaSG',
            Fn.importValue(`${networkStackName}-LambdaSecurityGroupId`)
        )

        const applicationSecurityGroup = SecurityGroup.fromSecurityGroupId(
            app,
            'ImportedApplicationSG',
            Fn.importValue(`${networkStackName}-ApplicationSecurityGroupId`)
        )

        // Create Postgres stack
        new Postgres(
            app,
            ResourceNames.stackName('postgres', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'postgres',
                vpc,
                lambdaSecurityGroup,
                applicationSecurityGroup,
            }
        )

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
            `CDK synthesis completed for Postgres stack: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('Postgres stack initialization failed:', error)
        console.error('\nTroubleshooting:')
        console.error(
            '- Check required environment variables: VPC_ID, SG_ID, SUBNET_*_ID'
        )
        console.error('- Check AWS credentials and region configuration')
        process.exit(1)
    }
}

main()
