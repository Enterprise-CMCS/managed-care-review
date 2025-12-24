#!/usr/bin/env node
import 'source-map-support/register'
import { App, Tags, DefaultStackSynthesizer, Fn } from 'aws-cdk-lib'
import { Vpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2'
import { AppConfigLoader } from '../lib/config/app'
import { getEnvironment, getCdkEnvironment } from '../lib/config/environments'
import { ResourceNames } from '../lib/config/shared'
import { AppApiStack } from '../lib/stacks/app-api'

// Simplified version - using default synthesizer with mcreview qualifier
function main(): void {
    try {
        const appConfig = AppConfigLoader.load()

        // Use default synthesizer with mcreview qualifier
        const app = new App({
            defaultStackSynthesizer: new DefaultStackSynthesizer({
                qualifier: 'mcreview',
            }),
        })

        app.node.setContext('stage', appConfig.stage)

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

        // Create App API stack
        new AppApiStack(
            app,
            ResourceNames.stackName('app-api', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'app-api',
                vpc,
                lambdaSecurityGroup,
                applicationSecurityGroup,
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
            `CDK synthesis completed for AppApi stack: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('App API stack initialization failed:', error)
        process.exit(1)
    }
}

main()
