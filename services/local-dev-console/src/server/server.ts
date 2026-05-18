import express from 'express'
import { join } from 'path'
import * as flagStore from './flagStore.js'
import * as emailStore from './emailStore.js'
import type { Response } from 'express'
import rateLimit from 'express-rate-limit'

const sseClients = new Set<Response>()
const ldStreamClients = new Set<Response>()
const emailClients = new Set<Response>()

function safeSseWrite(clients: Set<Response>, event: string, data: string): void {
    for (const res of clients) {
        try {
            res.write(`event: ${event}\ndata: ${data}\n\n`)
        } catch {
            clients.delete(res)
        }
    }
}

function broadcastFlagUpdate(): void {
    safeSseWrite(sseClients, 'update', JSON.stringify(flagStore.getAll()))
    safeSseWrite(ldStreamClients, 'put', JSON.stringify(toLDFlagFormat()))
}

function broadcastEmailUpdate(): void {
    safeSseWrite(emailClients, 'update', JSON.stringify(emailStore.list()))
}

type LDFlagEntry = {
    value: flagStore.FlagValue
    variation: number
    version: number
    flagVersion: number
}

function toLDFlagFormat(): Record<string, LDFlagEntry> {
    const result: Record<string, LDFlagEntry> = {}
    const allFlags = flagStore.getAll()
    for (const [key, value] of Object.entries(allFlags)) {
        result[key] = { value, variation: 0, version: 1, flagVersion: 1 }
    }
    return result
}

const app = express()
app.use(express.json({ limit: '1mb' }))

// CORS — only allow loopback origins. Server-to-server callers (app-api)
// send no Origin header and are unaffected. Blocks DNS-rebinding and
// drive-by-website attacks against the local dev API.
const ALLOWED_ORIGIN_HOSTS = new Set(['localhost', '127.0.0.1'])

function isAllowedOrigin(origin: string | undefined): origin is string {
    if (!origin) return false
    try {
        return ALLOWED_ORIGIN_HOSTS.has(new URL(origin).hostname)
    } catch {
        return false
    }
}

app.use((req, res, next) => {
    const origin = req.headers.origin
    if (isAllowedOrigin(origin)) {
        res.header('Access-Control-Allow-Origin', origin)
        res.header('Vary', 'Origin')
    }
    res.header('Access-Control-Allow-Headers', '*')
    res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS, REPORT, PATCH'
    )
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }
    next()
})

// --- Flag REST API ---

app.get('/flags', (_req, res) => {
    res.json(flagStore.getAll())
})

app.get('/flags/defaults', (_req, res) => {
    res.json(flagStore.getDefaults())
})

app.put('/flags/:key', (req, res) => {
    const { key } = req.params
    if (!flagStore.has(key)) {
        res.status(404).json({ error: `Unknown flag: ${key}` })
        return
    }
    const { value } = req.body
    if (
        value !== null &&
        typeof value !== 'boolean' &&
        typeof value !== 'string' &&
        typeof value !== 'number'
    ) {
        res.status(400).json({ error: 'Value must be boolean, string, number, or null' })
        return
    }
    flagStore.set(key, value)
    console.info(`Flag updated: ${key} = ${JSON.stringify(value)}`)
    broadcastFlagUpdate()
    res.json({ [key]: value })
})

app.post('/flags/reset', (_req, res) => {
    flagStore.resetAll()
    console.info('All flags reset to defaults')
    broadcastFlagUpdate()
    res.json(flagStore.getAll())
})

app.get('/flags/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    })
    const data = JSON.stringify(flagStore.getAll())
    res.write(`event: update\ndata: ${data}\n\n`)
    sseClients.add(res)
    req.on('close', () => sseClients.delete(res))
})

// --- Local email API ---

app.get('/emails', (_req, res) => {
    res.json(emailStore.list())
})

app.post('/emails', (req, res) => {
    if (!emailStore.isLocalEmailInput(req.body)) {
        res.status(400).json({ error: 'Invalid email payload' })
        return
    }

    const email = emailStore.add(req.body)
    console.info(
        `Local email received: ${email.subject} -> ${email.toAddresses.join(', ')}`
    )
    broadcastEmailUpdate()
    res.status(201).json(email)
})

app.post('/emails/reset', (_req, res) => {
    emailStore.clear()
    console.info('Local email inbox cleared')
    broadcastEmailUpdate()
    res.json(emailStore.list())
})

app.get('/emails/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    })
    res.write(`event: update\ndata: ${JSON.stringify(emailStore.list())}\n\n`)
    emailClients.add(res)
    req.on('close', () => emailClients.delete(res))
})

// --- LD Client SDK endpoints ---

app.get('/sdk/evalx/:envId/contexts/:context', (_req, res) => {
    res.json(toLDFlagFormat())
})

app.get('/sdk/evalx/:envId/users/:user', (_req, res) => {
    res.json(toLDFlagFormat())
})

app.get('/eval/:envId/:context', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    })
    res.write(`event: put\ndata: ${JSON.stringify(toLDFlagFormat())}\n\n`)
    ldStreamClients.add(res)
    req.on('close', () => ldStreamClients.delete(res))
})

app.post('/events/bulk/:envId', (_req, res) => {
    res.status(202).end()
})

app.post('/diagnostic', (_req, res) => {
    res.status(202).end()
})

// --- LD Server SDK endpoint ---

app.get('/sdk/latest-all', (_req, res) => {
    const allFlags = flagStore.getAll()
    const result: Record<string, object> = {}
    for (const [key, value] of Object.entries(allFlags)) {
        result[key] = {
            key,
            version: 1,
            on: true,
            variations: [value],
            fallthrough: { variation: 0 },
            offVariation: 0,
        }
    }
    res.json({ flags: result, segments: {} })
})

// --- Serve React app (built by Vite) ---

const distDir = join(import.meta.dirname, '..', '..', 'dist')
app.use(express.static(distDir))
const indexRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // limit each IP to 100 index requests per windowMs
})

app.get('/*splat', indexRateLimiter as unknown as express.RequestHandler, (_req, res) => {
    res.sendFile(join(distDir, 'index.html'))
})

const rawServiceUrl = process.env.LOCAL_DEV_SERVICE_URL
if (!rawServiceUrl) {
    console.error(
        'LOCAL_DEV_SERVICE_URL is not set. Add it to .envrc (or .envrc.local) and run `direnv allow`.'
    )
    process.exit(1)
}
const serviceUrl = new URL(rawServiceUrl)
const PORT = parseInt(serviceUrl.port || '3031', 10)
const HOST = serviceUrl.hostname

// Fetch real LD values on startup, then start the server
try {
    await flagStore.initFromLaunchDarkly()
} catch (err) {
    console.error('Failed to initialize flags from LaunchDarkly:', err)
    process.exit(1)
}

const server = app.listen(PORT, HOST, () => {
    console.info(`Local Dev Console running at ${serviceUrl}`)
    console.info(`UI: ${serviceUrl}`)
    console.info(`Flags API: ${serviceUrl}/flags`)
    console.info(`Loaded ${Object.keys(flagStore.getAll()).length} flags`)
})

// Shut down cleanly so restarts don't leave zombie processes
function shutdown() {
    for (const res of sseClients) res.end()
    for (const res of ldStreamClients) res.end()
    for (const res of emailClients) res.end()
    server.close(() => process.exit(0))
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
