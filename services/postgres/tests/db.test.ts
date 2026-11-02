import { readFile } from 'node:fs/promises'
import https from 'node:https'
import { Client } from 'pg'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DatabaseClient } from '../src/db'
import type { SecretDict } from '../src/types'

vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }))
vi.mock('pg', () => ({
    Client: vi.fn(
        class {
            connect = vi.fn().mockResolvedValue(undefined)
            end = vi.fn().mockResolvedValue(undefined)
        }
    ),
}))

const secret: SecretDict = {
    engine: 'postgres',
    host: 'database.example.com',
    username: 'database-user',
    password: 'test-password',
    dbname: 'application',
    port: 5433,
}
const certificate = 'test CA bundle contents'

beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('RDS_CA_BUNDLE_PATH', undefined)
    vi.mocked(readFile).mockResolvedValue(certificate)
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(https, 'get').mockImplementation(() => {
        throw new Error('Certificate downloads must not occur')
    })
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
})

describe('DatabaseClient certificate loading', () => {
    it('uses the local Lambda bundle with TLS verification enabled', async () => {
        const client = await new DatabaseClient().connect(secret)

        expect(readFile).toHaveBeenCalledWith(
            '/var/runtime/ca-cert.pem',
            'utf8'
        )
        expect(Client).toHaveBeenCalledExactlyOnceWith({
            host: secret.host,
            user: secret.username,
            password: secret.password,
            database: secret.dbname,
            port: secret.port,
            ssl: { rejectUnauthorized: true, ca: certificate },
            connectionTimeoutMillis: 10000,
            statement_timeout: 10000,
        })
        expect(client).not.toBeNull()
        expect(client?.connect).toHaveBeenCalledOnce()
        expect(https.get).not.toHaveBeenCalled()
    })

    it('supports an explicit local certificate path', async () => {
        vi.stubEnv('RDS_CA_BUNDLE_PATH', '/local/certificates/rds.pem')

        await new DatabaseClient().connect(secret)

        expect(readFile).toHaveBeenCalledWith(
            '/local/certificates/rds.pem',
            'utf8'
        )
        expect(Client).toHaveBeenCalledWith(
            expect.objectContaining({
                ssl: { rejectUnauthorized: true, ca: certificate },
            })
        )
    })

    it.each(['ENOENT', 'EACCES'])(
        'fails before creating a database client when the bundle read fails with %s',
        async (code) => {
            const error = Object.assign(new Error('Cannot read CA bundle'), {
                code,
            })
            vi.mocked(readFile).mockRejectedValue(error)

            await expect(new DatabaseClient().connect(secret)).rejects.toBe(
                error
            )

            expect(Client).not.toHaveBeenCalled()
            expect(https.get).not.toHaveBeenCalled()
            expect(console.error).toHaveBeenCalledWith(
                'Failed to read RDS certificate bundle:',
                error
            )
        }
    )

    it.each(['', ' \n\t'])(
        'fails before connecting when the bundle is empty (%j)',
        async (contents) => {
            vi.mocked(readFile).mockResolvedValue(contents)

            await expect(new DatabaseClient().connect(secret)).rejects.toThrow(
                'RDS CA bundle is empty: /var/runtime/ca-cert.pem'
            )

            expect(Client).not.toHaveBeenCalled()
            expect(https.get).not.toHaveBeenCalled()
        }
    )
})
