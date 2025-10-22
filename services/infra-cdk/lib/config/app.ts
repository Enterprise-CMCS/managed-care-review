export interface AppConfig {
    stage: string
    awsRegion: string
    permissionsBoundaryArn?: string
}

export class AppConfigLoader {
    static load(): AppConfig {
        const stage = this.getStage()
        const awsRegion = this.getRequiredEnv('AWS_REGION')
        const permissionsBoundaryArn = process.env.PERM_BOUNDARY_ARN

        return {
            stage,
            awsRegion,
            permissionsBoundaryArn,
        }
    }

    private static getStage(): string {
        // Check environment variable first
        if (process.env.STAGE_NAME) {
            return process.env.STAGE_NAME
        }

        // Check command line arguments
        const stageArg = process.argv.find((arg) => arg.includes('stage='))
        if (stageArg) {
            return stageArg.split('=')[1]
        }

        throw new Error(
            'Stage must be provided via STAGE_NAME environment variable or --context stage=<stage>'
        )
    }

    private static getRequiredEnv(key: string): string {
        const value = process.env[key]
        if (!value) {
            throw new Error(`${key} environment variable is required`)
        }
        return value
    }
}
