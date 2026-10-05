/** Fail closed: the POC must be explicitly enabled in a branch review stage. */
export function submissionEventsStage(
    env: Record<string, string | undefined> = process.env
): string | undefined {
    const stage = env.stage
    if (
        env.SUBMISSION_EVENTS_POC_ENABLED !== 'true' ||
        !stage ||
        !/^[a-z][a-z0-9-]{1,22}$/.test(stage) ||
        ['dev', 'val', 'qa', 'prod', 'main', 'master', 'production'].includes(
            stage
        )
    ) {
        return undefined
    }
    return stage
}
