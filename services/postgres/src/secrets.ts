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
        const command = token
            ? new GetSecretValueCommand({
                  SecretId: arn,
                  VersionId: token,
                  VersionStage: stage,
              })
            : new GetSecretValueCommand({ SecretId: arn, VersionStage: stage })

        const secret = await this.client.send(command)
        if (!secret.SecretString) {
            throw new Error('Secret string is empty')
        }

        const secretDict = JSON.parse(secret.SecretString) as SecretDict
        this.validateSecret(secretDict)

        return secretDict
    }

    private validateSecret(secretDict: SecretDict): void {
        const requiredFields = ['host', 'username', 'password']
        const supportedEngines = ['postgres', 'aurora-postgresql']

        if (
            !secretDict.engine ||
            !supportedEngines.includes(secretDict.engine)
        ) {
            throw new Error(
                "Database engine must be set to 'postgres' or 'aurora-postgresql'"
            )
        }

        for (const field of requiredFields) {
            if (!(field in secretDict)) {
                throw new Error(`${field} is missing from secret JSON`)
            }
        }
    }

    async generatePassword(): Promise<string> {
        const command = new GetRandomPasswordCommand({
            PasswordLength: 32,
            ExcludeCharacters: ':/@"\'\\',
        })

        const result = await this.client.send(command)
        if (!result.RandomPassword) {
            throw new Error('Failed to generate random password')
        }

        return result.RandomPassword
    }

    async putSecret(
        arn: string,
        token: string,
        secret: SecretDict
    ): Promise<void> {
        const command = new PutSecretValueCommand({
            SecretId: arn,
            ClientRequestToken: token,
            SecretString: JSON.stringify(secret),
            VersionStages: ['AWSPENDING'],
        })

        await this.client.send(command)
    }

    async updateSecretStage(
        arn: string,
        token: string,
        currentVersion?: string
    ): Promise<void> {
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
    }

    async describeSecret(arn: string): Promise<DescribeSecretCommandOutput> {
        const command = new DescribeSecretCommand({ SecretId: arn })
        return this.client.send(command)
    }
}
