import { Client, ClientConfig } from 'pg'
import { SecretDict } from './types'

export class DatabaseClient {
    private getConfig(secretDict: SecretDict, useSSL: boolean): ClientConfig {
        return {
            host: secretDict.host,
            user: secretDict.username,
            password: secretDict.password,
            database: secretDict.dbname || 'postgres',
            port: secretDict.port || 5432,
            ssl: useSSL
                ? {
                      rejectUnauthorized: true,
                  }
                : false,
            connectionTimeoutMillis: 5000,
            statement_timeout: 10000,
        }
    }

    getSSLConfig(secretDict: SecretDict): [boolean, boolean] {
        if (!('ssl' in secretDict)) {
            return [true, true]
        }

        if (typeof secretDict.ssl === 'boolean') {
            return [secretDict.ssl, false]
        }

        if (typeof secretDict.ssl === 'string') {
            const ssl = secretDict.ssl.toLowerCase()
            if (ssl === 'true') return [true, false]
            if (ssl === 'false') return [false, false]
        }

        return [true, true]
    }

    async connect(secretDict: SecretDict): Promise<Client | null> {
        const [useSSL, fallBack] = this.getSSLConfig(secretDict)
        try {
            // Try SSL first if configured
            const conn = await this.tryConnect(secretDict, useSSL)
            if (conn || !fallBack) {
                return conn
            }
            // Fallback to non-SSL if allowed
            return this.tryConnect(secretDict, false)
        } catch (error) {
            console.error('Failed to connect:', error)
            return null
        }
    }

    private async tryConnect(
        secretDict: SecretDict,
        useSSL: boolean
    ): Promise<Client | null> {
        const config = this.getConfig(secretDict, useSSL)
        const client = new Client(config)

        try {
            await client.connect()
            console.log(
                `Successfully connected ${useSSL ? 'with' : 'without'} SSL as user '${secretDict.username}'`
            )
            return client
        } catch (err) {
            console.error('Connection failed:', err)
            await client.end().catch(console.error)
            return null
        }
    }

    async updatePassword(
        client: Client,
        username: string,
        password: string
    ): Promise<void> {
        // First escape the username
        const escapedResult = await client.query(
            'SELECT quote_ident($1) as username',
            [username]
        )
        const escapedUsername = escapedResult.rows[0].username

        // Use dollar-quoted string literal for the password
        await client.query(
            `ALTER USER ${escapedUsername} WITH PASSWORD $1::text`,
            [password]
        )
    }
}
