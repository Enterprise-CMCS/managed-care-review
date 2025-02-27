import { Client, ClientConfig } from 'pg'
import { SecretDict } from './types'
import https from 'https'

export class DatabaseClient {
    private async getRdsCertificate(): Promise<string> {
        try {
            const certUrl =
                'https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem'

            return new Promise((resolve, reject) => {
                https
                    .get(certUrl, (res) => {
                        let cert = ''
                        res.on('data', (chunk) => (cert += chunk))
                        res.on('end', () => resolve(cert))
                        res.on('error', reject)
                    })
                    .on('error', reject)
            })
        } catch (error) {
            console.error('Failed to download RDS certificate:', error)
            throw error
        }
    }

    private async getConfig(secretDict: SecretDict): Promise<ClientConfig> {
        const cert = await this.getRdsCertificate()

        return {
            host: secretDict.host,
            user: secretDict.username,
            password: secretDict.password,
            database: secretDict.dbname || 'postgres',
            port: secretDict.port || 5432,
            ssl: {
                rejectUnauthorized: true,
                ca: cert,
            },
            connectionTimeoutMillis: 5000,
            statement_timeout: 10000,
        }
    }

    async connect(secretDict: SecretDict): Promise<Client | null> {
        console.log('Attempting SSL connection for user:', secretDict.username)

        const config = await this.getConfig(secretDict)
        const client = new Client(config)

        try {
            await client.connect()
            console.log(
                `Successfully connected with SSL as user '${secretDict.username}'`
            )
            return client
        } catch (err) {
            console.error('SSL connection failed:', err)
            await client.end().catch(console.error)
            return null
        }
    }

    async updatePassword(
        client: Client,
        username: string,
        password: string
    ): Promise<void> {
        try {
            const alterPassword = `ALTER USER ${username} WITH PASSWORD '${password}'`
            console.log(
                `Updating password for ${username} from secrets manager`
            )

            await client.query(alterPassword)
        } catch (error) {
            console.error('Error updating password:', error)
            throw error
        }
    }
}
