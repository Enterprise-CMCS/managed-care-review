import * as cdk from 'aws-cdk-lib'
import { Aspects } from 'aws-cdk-lib'
import { type AppConfig } from './config/app'
import { type SynthesizerConfig } from './config/synthesizer'
import { IamPathAspect } from './aspects/iam-path-aspects'
import { IamPermissionsBoundaryAspect } from './aspects/iam-permissions-boundary-aspects'
import { StackOrchestrator } from './stack-orchestrator'
import { getEnvironment, getCdkEnvironment } from './config'

export class CdkAppFactory {
    static async create(
        appConfig: AppConfig,
        synthConfig: SynthesizerConfig
    ): Promise<cdk.App> {
        const app = new cdk.App({
            defaultStackSynthesizer: new cdk.DefaultStackSynthesizer(
                synthConfig
            ),
        })

        // Set stage context
        app.node.setContext('stage', appConfig.stage)

        // Create stacks
        const config = getEnvironment(appConfig.stage)
        const env = getCdkEnvironment(appConfig.stage)

        const orchestrator = new StackOrchestrator({
            app,
            stage: appConfig.stage,
            env,
            config,
        })

        orchestrator.createAllStacks()

        // Apply IAM aspects
        this.applyAspects(app, appConfig)

        // Add resource tags
        this.addTags(app, appConfig.stage)

        return app
    }

    private static applyAspects(app: cdk.App, config: AppConfig): void {
        Aspects.of(app).add(new IamPathAspect(config.iamPath))

        if (config.permissionsBoundaryArn) {
            Aspects.of(app).add(
                new IamPermissionsBoundaryAspect(config.permissionsBoundaryArn)
            )
        }
    }

    private static addTags(app: cdk.App, stage: string): void {
        cdk.Tags.of(app).add('Project', 'mc-review')
        cdk.Tags.of(app).add('Environment', stage)
        cdk.Tags.of(app).add('ManagedBy', 'CDK')
        cdk.Tags.of(app).add(
            'Repository',
            'https://github.com/Enterprise-CMCS/managed-care-review'
        )
    }
}
