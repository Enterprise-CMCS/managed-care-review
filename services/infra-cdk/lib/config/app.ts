export interface AppConfig {
    stage: string
}

export class AppConfigLoader {
    static load(): AppConfig {
        const stage = this.getStage()

        return {
            stage,
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
}
