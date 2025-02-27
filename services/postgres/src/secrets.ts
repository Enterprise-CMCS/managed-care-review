import {
    SecretsManagerClient,
    GetSecretValueCommand,
    DescribeSecretCommand,
    PutSecretValueCommand,
    UpdateSecretVersionStageCommand,
    UpdateSecretVersionStageCommandInput,
    GetRandomPasswordCommand,
    DescribeSecretCommandOutput,
} from '@aws-sdk/client-secrets-manager'
import { SecretDict } from './types'

export class SecretsManagerError extends Error {
    constructor(
        message: string,
        public readonly operation: string,
        public readonly cause?: Error
    ) {
        super(message)
        this.name = 'SecretsManagerError'
    }
}

export class SecretsManager {
    private client: SecretsManagerClient

    constructor() {
        this.client = new SecretsManagerClient({})
    }

    async getSecretDict(
        arn: string,
        stage: string,
        token?: string
    ): Promise<SecretDict> {
        try {
            const command = token
                ? new GetSecretValueCommand({
                      SecretId: arn,
                      VersionId: token,
                      VersionStage: stage,
                  })
                : new GetSecretValueCommand({
                      SecretId: arn,
                      VersionStage: stage,
                  })

            const secret = await this.client.send(command)

            if (!secret.SecretString) {
                throw new SecretsManagerError(
                    'Secret string is empty',
                    'getSecretDict'
                )
            }

            const secretDict = JSON.parse(secret.SecretString) as SecretDict
            this.validateSecret(secretDict)
            return secretDict
        } catch (error) {
            if (error instanceof SecretsManagerError) {
                throw error
            }

            throw new SecretsManagerError(
                `Failed to retrieve secret from ARN: ${arn}, Stage: ${stage}${token ? ', Token: ' + token : ''}`,
                'getSecretDict',
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }

    private validateSecret(secretDict: SecretDict): void {
        const requiredFields = ['host', 'username', 'password']
        const supportedEngines = ['postgres', 'aurora-postgresql']

        if (
            !secretDict.engine ||
            !supportedEngines.includes(secretDict.engine)
        ) {
            throw new SecretsManagerError(
                `Database engine must be set to 'postgres' or 'aurora-postgresql'. Got: ${secretDict.engine || 'undefined'}`,
                'validateSecret'
            )
        }

        for (const field of requiredFields) {
            if (!(field in secretDict)) {
                throw new SecretsManagerError(
                    `${field} is missing from secret JSON`,
                    'validateSecret'
                )
            }
        }
    }

    async generatePassword(): Promise<string> {
        try {
            const command = new GetRandomPasswordCommand({
                PasswordLength: 32,
                ExcludeCharacters: ':/@"\'\\',
            })

            const result = await this.client.send(command)

            if (!result.RandomPassword) {
                throw new SecretsManagerError(
                    'Failed to generate random password: API returned empty password',
                    'generatePassword'
                )
            }

            return result.RandomPassword
        } catch (error) {
            if (error instanceof SecretsManagerError) {
                throw error
            }

            throw new SecretsManagerError(
                'Failed to generate random password',
                'generatePassword',
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }

    async putSecret(
        arn: string,
        token: string,
        secret: SecretDict
    ): Promise<void> {
        try {
            const command = new PutSecretValueCommand({
                SecretId: arn,
                ClientRequestToken: token,
                SecretString: JSON.stringify(secret),
                VersionStages: ['AWSPENDING'],
            })

            await this.client.send(command)
        } catch (error) {
            throw new SecretsManagerError(
                `Failed to put secret for ARN: ${arn}, Token: ${token}`,
                'putSecret',
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }

    async updateSecretStage(
        arn: string,
        token: string,
        currentVersion?: string
    ): Promise<void> {
        try {
            const commandInput: UpdateSecretVersionStageCommandInput = {
                SecretId: arn,
                VersionStage: 'AWSCURRENT',
                MoveToVersionId: token,
            }

            if (currentVersion) {
                commandInput.RemoveFromVersionId = currentVersion
            }

            const command = new UpdateSecretVersionStageCommand(commandInput)
            await this.client.send(command)
        } catch (error) {
            throw new SecretsManagerError(
                `Failed to update secret stage for ARN: ${arn}, Token: ${token}${
                    currentVersion ? ', Current Version: ' + currentVersion : ''
                }`,
                'updateSecretStage',
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }

    async describeSecret(arn: string): Promise<DescribeSecretCommandOutput> {
        try {
            const command = new DescribeSecretCommand({ SecretId: arn })
            return await this.client.send(command)
        } catch (error) {
            throw new SecretsManagerError(
                `Failed to describe secret for ARN: ${arn}`,
                'describeSecret',
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }
}
