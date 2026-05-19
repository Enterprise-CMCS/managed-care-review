import { useState, useEffect, useCallback } from 'react'

type FlagValue = boolean | string | number | null

type FlagData = Record<string, FlagValue>

const API_BASE = '/flags'

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init)
    if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`)
    }
    return res.json() as Promise<T>
}

export function useFlags() {
    const [flags, setFlags] = useState<FlagData>({})
    const [defaults, setDefaults] = useState<FlagData>({})
    const [connected, setConnected] = useState(false)

    // Initial fetch
    useEffect(() => {
        Promise.all([
            fetchJson<FlagData>(`${API_BASE}`),
            fetchJson<FlagData>(`${API_BASE}/defaults`),
        ]).then(([flagData, defaultData]) => {
            setFlags(flagData)
            setDefaults(defaultData)
        }).catch((err) => {
            console.warn('Failed to fetch initial flags:', err.message)
        })
    }, [])

    // SSE subscription for live updates
    useEffect(() => {
        const es = new EventSource(`${API_BASE}/stream`)

        es.addEventListener('update', (e: MessageEvent) => {
            setFlags(JSON.parse(e.data))
            setConnected(true)
        })

        es.onerror = () => setConnected(false)

        return () => es.close()
    }, [])

    const updateFlag = useCallback(async (key: string, value: FlagValue) => {
        await fetch(`${API_BASE}/${encodeURIComponent(key)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value }),
        })
    }, [])

    const resetAll = useCallback(async () => {
        await fetch(`${API_BASE}/reset`, { method: 'POST' })
    }, [])

    const enableAll = useCallback(async () => {
        for (const [key, value] of Object.entries(flags)) {
            if (typeof value === 'boolean' && !value) {
                await updateFlag(key, true)
            }
        }
    }, [flags, updateFlag])

    const disableAll = useCallback(async () => {
        for (const [key, value] of Object.entries(flags)) {
            if (typeof value === 'boolean' && value) {
                await updateFlag(key, false)
            }
        }
    }, [flags, updateFlag])

    return { flags, defaults, connected, updateFlag, resetAll, enableAll, disableAll }
}

export type { FlagValue, FlagData }
