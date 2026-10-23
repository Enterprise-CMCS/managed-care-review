import {
    AssumeRoleWithWebIdentityCommand,
    STSClient,
} from '@aws-sdk/client-sts'
import type { BackupRestoreConfig } from './backup-restore-config'

// The SDK memoizes credentials and calls this provider again before expiration.
// Unlike exported GHA credentials, this supports a multi-hour restore + cleanup.
export function githubBackupCredentials(
    config: BackupRestoreConfig,
    readOnly: boolean,
    dependencies: { fetch: typeof fetch; sts: Pick<STSClient, 'send'> } = {
        fetch,
        sts: new STSClient({
            region: config.region,
            maxAttempts: 3,
            requestHandler: { requestTimeout: 20000, connectionTimeout: 5000 },
        }),
    }
) {
    return async () => {
        const endpoint = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
        const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
        if (
            !endpoint ||
            !requestToken ||
            process.env.GITHUB_ACTIONS !== 'true'
        ) {
            throw new Error(
                'Backup tests must run in GitHub Actions with id-token: write; no local/deployment credential fallback'
            )
        }
        const url = new URL(endpoint)
        if (url.protocol !== 'https:')
            throw new Error('Invalid GitHub OIDC endpoint')
        url.searchParams.set('audience', 'sts.amazonaws.com')
        const response = await dependencies.fetch(url, {
            headers: { Authorization: `Bearer ${requestToken}` },
            signal: AbortSignal.timeout(10000),
        })
        if (!response.ok)
            throw new Error('Could not obtain GitHub OIDC identity')
        const token = (await response.json()) as { value?: string }
        if (!token.value) throw new Error('GitHub returned no OIDC token')
        const result = await dependencies.sts.send(
            new AssumeRoleWithWebIdentityCommand({
                RoleArn: config.roleArn,
                RoleSessionName:
                    `backup-test-${process.env.GITHUB_RUN_ID ?? 'run'}-${process.env.GITHUB_RUN_ATTEMPT ?? '1'}`.slice(
                        0,
                        64
                    ),
                WebIdentityToken: token.value,
                DurationSeconds: 3600,
                // Defense in depth: the daily checker cannot create/delete resources
                // or manufacture a new last-success timestamp, even on a code mistake.
                ...(readOnly
                    ? {
                          Policy: JSON.stringify({
                              Version: '2012-10-17',
                              Statement: [
                                  {
                                      Effect: 'Allow',
                                      Action: [
                                          'rds:DescribeDBClusters',
                                          'rds:ListTagsForResource',
                                          'ssm:GetParameter',
                                          'cloudformation:DescribeStacks',
                                      ],
                                      Resource: '*',
                                  },
                              ],
                          }),
                      }
                    : {}),
            })
        )
        const credentials = result.Credentials
        if (
            !credentials?.AccessKeyId ||
            !credentials.SecretAccessKey ||
            !credentials.SessionToken ||
            !credentials.Expiration
        ) {
            throw new Error('STS returned incomplete test-role credentials')
        }
        return {
            accessKeyId: credentials.AccessKeyId,
            secretAccessKey: credentials.SecretAccessKey,
            sessionToken: credentials.SessionToken,
            expiration: credentials.Expiration,
        }
    }
}
