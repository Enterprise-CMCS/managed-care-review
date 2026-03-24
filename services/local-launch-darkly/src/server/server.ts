import express from 'express'
import { join } from 'path'
import * as flagStore from './flagStore.js'
import type { Response } from 'express'
import rateLimit from 'express-rate-limit'

const sseClients = new Set<Response>()
const ldStreamClients = new Set<Response>()

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
app.use(express.json({ limit: '10kb' }))

// CORS
app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', '*')
    res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS, REPORT, PATCH'
    )
    if (_req.method === 'OPTIONS') {
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

app.get('*', indexRateLimiter as unknown as express.RequestHandler, (_req, res) => {
    res.sendFile(join(distDir, 'index.html'))
})

const serviceUrl = new URL(process.env.LOCAL_LD_SERVICE_URL || 'http://127.0.0.1:3031')
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
    console.info(`Local LaunchDarkly running at ${serviceUrl}`)
    console.info(`UI: ${serviceUrl}`)
    console.info(`Flags API: ${serviceUrl}/flags`)
    console.info(`Loaded ${Object.keys(flagStore.getAll()).length} flags`)
})

// Shut down cleanly so restarts don't leave zombie processes
function shutdown() {
    for (const res of sseClients) res.end()
    for (const res of ldStreamClients) res.end()
    server.close(() => process.exit(0))
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
