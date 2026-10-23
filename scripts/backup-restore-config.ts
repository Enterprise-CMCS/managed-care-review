// Shared by CDK and the runner: callers cannot choose an arbitrary source/target.
export const BACKUP_TEST_REGION = 'us-east-1'
export const BACKUP_TEST_PURPOSE = 'aurora-backup-restore-test'
// Operational guards, not promises about application RPO/RTO. Review before rollout.
export const MAX_RECOVERY_POINT_AGE_MS = 60 * 60 * 1000
export const MAX_SUCCESS_AGE_MS = 35 * 24 * 60 * 60 * 1000
export const ORPHAN_AGE_MS = 6 * 60 * 60 * 1000
export const MAIN_BUDGET_SECONDS = 150 * 60
export const CLEANUP_BUDGET_SECONDS = 60 * 60

const protectedStages = new Set([
    'local',
    'dev',
    'main',
    'master',
    'develop',
    'impl',
    'val',
    'qa',
    'production',
])

export function isBackupTestStage(stage: string): boolean {
    return (
        /^[a-z][a-z0-9-]{1,22}$/.test(stage) &&
        !stage.endsWith('-') &&
        !stage.includes('--') &&
        !protectedStages.has(stage)
    )
}

export function backupRestoreConfig(stage: string, account: string) {
    if (!/^\d{12}$/.test(account) || !isBackupTestStage(stage)) {
        throw new Error(
            'Expected prod or a disposable review stage, and an explicit AWS account'
        )
    }
    const sourceStage = stage === 'prod' ? 'prod' : 'dev'
    const sourceIdentifier = `postgres-${sourceStage}-cluster-cdk`
    const clusterPrefix = `mcr-bkt-${stage}-`
    const roleName = `postgres-${stage}-backupRestoreTest-cdk`
    return {
        stage,
        account,
        sourceStage,
        sourceIdentifier,
        clusterPrefix,
        region: BACKUP_TEST_REGION,
        sourceArn: `arn:aws:rds:${BACKUP_TEST_REGION}:${account}:cluster:${sourceIdentifier}`,
        roleName,
        roleArn: `arn:aws:iam::${account}:role/delegatedadmin/developer/${roleName}`,
        stackName: `postgres-${stage}-cdk`,
        parameterName: `/mcr/${stage}/backup-restore-test/last-success`,
        expectedDatabase:
            stage === 'prod'
                ? `aurora_postgres_prod_${account}_cdk`
                : `reviewapp_${stage}`,
    }
}
export type BackupRestoreConfig = ReturnType<typeof backupRestoreConfig>
