import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager'

export interface SynthesizerConfig {
    qualifier: string
    bootstrapStackVersionSsmParameter: string
    bucketName: string
    fileAssetsBucketName: string
    repositoryName: string
}

export class SynthesizerConfigLoader {
    private readonly client: SecretsManagerClient

    constructor(region?: string) {
        this.client = new SecretsManagerClient({
            region: region || process.env.AWS_REGION || 'us-east-1',
        })
    }

    async load(): Promise<SynthesizerConfig> {
        try {
            const response = await this.client.send(
                new GetSecretValueCommand({
                    SecretId: 'cdkSynthesizerConfig', //pragma: allowlist secret
                })
            )

            if (!response.SecretString) {
                throw new Error('cdkSynthesizerConfig secret has no value')
            }

            return JSON.parse(response.SecretString) as SynthesizerConfig
        } catch (error) {
            console.warn(
                'Unable to load CDK synthesizer config from Secrets Manager:',
                error instanceof Error ? error.message : String(error)
            )
            console.warn('Using default synthesizer configuration')

            return this.getDefaultConfig()
        }
    }

    private getDefaultConfig(): SynthesizerConfig {
        return {
            qualifier: 'hnb659fds',
            bootstrapStackVersionSsmParameter:
                '/cdk-bootstrap/hnb659fds/version',
            bucketName: 'cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}',
            fileAssetsBucketName:
                'cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}',
            repositoryName:
                'cdk-hnb659fds-container-assets-${AWS::AccountId}-${AWS::Region}',
        }
    }
}
