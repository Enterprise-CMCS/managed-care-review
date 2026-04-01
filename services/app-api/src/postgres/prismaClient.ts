import { PrismaClient } from '../generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { trace, SpanStatusCode } from '@opentelemetry/api'

const errorMessages = {
    delete: 'Deletion of records is not allowed',
    create: 'Creation of new records is not allowed',
}

/**
 * Extends PrismaClient with custom behavior for specific models.
 *
 * Overrides delete and create operations on `applicationSettings` and `emailSettings`
 * models to throw custom error messages.
 *
 * @param optionArgs - Prisma adapter configuration with PrismaPg adapter
 * @param optionArgs.adapter - PrismaPg adapter instance with pg.Pool
 * @returns Extended PrismaClient instance with custom query behaviors
 */
function extendedPrismaClient(optionArgs: { adapter: PrismaPg }) {
    return new PrismaClient(optionArgs).$extends({
        query: {
            applicationSettings: {
                delete: () => {
                    throw new Error(
                        `ApplicationSettings: ${errorMessages.delete}`
                    )
                },
                deleteMany: () => {
                    throw new Error(
                        `ApplicationSettings: ${errorMessages.delete}`
                    )
                },
                create: () => {
                    throw new Error(
                        `ApplicationSettings: ${errorMessages.create}`
                    )
                },
                createMany: () => {
                    throw new Error(
                        `ApplicationSettings: ${errorMessages.create}`
                    )
                },
            },
            emailSettings: {
                delete: () => {
                    throw new Error(`EmailSettings: ${errorMessages.delete}`)
                },
                deleteMany: () => {
                    throw new Error(`EmailSettings: ${errorMessages.delete}`)
                },
                create: () => {
                    throw new Error(`EmailSettings: ${errorMessages.create}`)
                },
                createMany: () => {
                    throw new Error(`EmailSettings: ${errorMessages.create}`)
                },
            },
        },
    })
}

type ExtendedPrismaClient = ReturnType<typeof extendedPrismaClient>

interface CachedPrismaClient {
    client: ExtendedPrismaClient
    createdAt: number
}

/**
 * Module-level singleton cache for Prisma clients
 * Keyed by stable identifier (host/port/dbname/username) to handle credential rotations
 * Prevents connection pool leaks in Lambda warm containers by reusing clients
 *
 * Cached clients expire after 12 hours to handle credential rotations gracefully
 */
const prismaClientCache = new Map<string, CachedPrismaClient>()

/**
 * Time-to-live for cached Prisma clients in milliseconds (12 hours)
 * This ensures rotated credentials are picked up within a reasonable timeframe
 */
const CACHE_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

/**
 * Derives a stable cache key from connection URL that excludes credentials
 * This allows the same cache entry to be updated when passwords rotate,
 * preventing accumulation of orphaned clients
 *
 * @param connURL - PostgreSQL connection string
 * @returns Stable cache key (username@host:port/dbname)
 */
function getCacheKey(connURL: string): string {
    try {
        const url = new URL(connURL)
        const username = url.username || 'unknown'
        const host = url.hostname
        const port = url.port || '5432'
        const dbname = url.pathname.slice(1) // Remove leading /
        return `${username}@${host}:${port}/${dbname}`
    } catch {
        // Fallback to full URL if parsing fails
        return connURL
    }
}

/**
 * Gets or creates a Prisma client for the given connection URL
 *
 * Uses singleton pattern with TTL-based expiration to prevent connection pool leaks
 * while handling credential rotations gracefully.
 *
 * Caching behavior:
 * - Cached clients expire after 12 hours and are automatically recreated
 * - Credentials are stable within environments
 * - TTL provides safety net for unexpected rotations
 *
 * @param connURL - PostgreSQL connection string
 * @param enableCaching - Whether to cache the Prisma client (default: true)
 * @returns Cached or new ExtendedPrismaClient instance
 */
async function NewPrismaClient(
    connURL: string,
    enableCaching: boolean = true
): Promise<ExtendedPrismaClient | Error> {
    const tracer = trace.getTracer('prisma-client-cache')
    const span = tracer.startSpan('prisma.client.get_or_create', {
        attributes: {
            'prisma.cache.enabled': enableCaching,
            'prisma.cache.total_cached': prismaClientCache.size,
        },
    })

    try {
        // Use stable cache key that excludes credentials to handle password rotations
        const cacheKey = getCacheKey(connURL)

        // Check if we already have a client for this connection (only if caching enabled)
        if (enableCaching) {
            const cached = prismaClientCache.get(cacheKey)
            if (cached) {
                const age = Date.now() - cached.createdAt
                const ageMinutes = Math.round(age / 1000 / 60)

                // Check if cached client is still within TTL
                if (age < CACHE_TTL_MS) {
                    span.setAttributes({
                        'prisma.cache.hit': true,
                        'prisma.cache.age_minutes': ageMinutes,
                        'prisma.cache.age_ms': age,
                        'prisma.cache.ttl_remaining_ms': CACHE_TTL_MS - age,
                    })
                    span.setStatus({ code: SpanStatusCode.OK })
                    span.end()

                    console.info(
                        `Reusing cached Prisma client (age: ${ageMinutes} minutes)`
                    )
                    return cached.client
                }

                // Cached client expired - disconnect and remove it
                const ageHours = Math.round(age / 1000 / 60 / 60)
                span.setAttributes({
                    'prisma.cache.hit': true,
                    'prisma.cache.expired': true,
                    'prisma.cache.age_hours': ageHours,
                    'prisma.cache.age_ms': age,
                })

                console.info(
                    `Cached Prisma client expired (age: ${ageHours} hours), creating new client`
                )
                try {
                    await cached.client.$disconnect()
                } catch (err) {
                    console.error(
                        'Error disconnecting expired Prisma client:',
                        err
                    )
                    span.recordException(
                        err instanceof Error ? err : new Error(String(err))
                    )
                }
                prismaClientCache.delete(cacheKey)
            } else {
                span.setAttribute('prisma.cache.hit', false)
            }
        } else {
            span.setAttribute('prisma.cache.disabled', true)
        }

        span.setAttribute('prisma.client.creating', true)

        console.info(
            enableCaching
                ? 'Creating new Prisma client (cold start, cache miss, or cache expired)'
                : 'Creating new Prisma client (caching disabled)'
        )
        const pool = new pg.Pool({ connectionString: connURL })
        const adapter = new PrismaPg(pool)

        const prismaClient = extendedPrismaClient({
            adapter,
        })

        // Cache for future invocations in this warm container (only if caching enabled)
        if (enableCaching) {
            prismaClientCache.set(cacheKey, {
                client: prismaClient,
                createdAt: Date.now(),
            })
            span.setAttribute('prisma.cache.stored', true)
            span.setAttribute('prisma.cache.key', cacheKey)
        }

        span.setStatus({ code: SpanStatusCode.OK })
        span.end()

        return prismaClient
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e))

        span.recordException(error)
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
        })
        span.end()

        if (e instanceof Error) {
            console.info('Error creating prisma client: ', e)
            return e
        }
        console.info('Unexpected Error creating prisma client: ', e)
        return new Error('Unknown error create prisma client')
    }
}

/**
 * Disconnects and clears all cached Prisma clients
 * Primarily used in tests to ensure clean state between test runs
 */
async function disconnectAllPrismaClients(): Promise<void> {
    console.info(
        `Disconnecting ${prismaClientCache.size} cached Prisma client(s)`
    )
    for (const cached of prismaClientCache.values()) {
        try {
            await cached.client.$disconnect()
            // Avoid logging connection URL that may contain credentials
            console.info('Disconnected Prisma client')
        } catch (err) {
            console.error('Error disconnecting Prisma client:', err)
        }
    }
    prismaClientCache.clear()
}

export { NewPrismaClient, disconnectAllPrismaClients }
export type { ExtendedPrismaClient }
