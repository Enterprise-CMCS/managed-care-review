const forbiddenSyntheticDataStages: Record<string, true> = {
    local: true,
    main: true,
    dev: true,
    val: true,
    prod: true,
}

export type SyntheticDataEnvironment = {
    stage?: string
    SYNTHETIC_DATA_ENABLED?: string
    SYNTHETIC_DATA_ALLOWED_STAGE?: string
}

export function isSyntheticDataEnvironmentEnabled(
    environment: SyntheticDataEnvironment = process.env
): boolean {
    const stage = environment.stage
    const allowedStage = environment.SYNTHETIC_DATA_ALLOWED_STAGE

    return !!(
        environment.SYNTHETIC_DATA_ENABLED === 'true' &&
        stage &&
        allowedStage &&
        stage === allowedStage &&
        !forbiddenSyntheticDataStages[stage]
    )
}

export function assertSyntheticDataEnvironment(
    expectedStage: string,
    environment: SyntheticDataEnvironment = process.env
): void {
    if (expectedStage !== environment.stage) {
        throw new Error(
            'Synthetic data request stage does not match runtime stage'
        )
    }

    if (!isSyntheticDataEnvironmentEnabled(environment)) {
        throw new Error('Synthetic data is not enabled for this environment')
    }
}
