import { Client, ClientConfig } from 'pg'
import { SecretDict } from './types'
import { readFile } from 'node:fs/promises'

export class DatabaseClient {
    private async getRdsCertificate(): Promise<string> {
        try {
            // Managed Node.js Lambda runtimes include Amazon's CA bundle.
            const certPath =
                process.env.RDS_CA_BUNDLE_PATH ?? '/var/runtime/ca-cert.pem'
            const cert = await readFile(certPath, 'utf8')
            if (!cert.trim()) {
                throw new Error(`RDS CA bundle is empty: ${certPath}`)
            }
            return cert
        } catch (error) {
            console.error('Failed to read RDS certificate bundle:', error)
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
            connectionTimeoutMillis: 10000,
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
