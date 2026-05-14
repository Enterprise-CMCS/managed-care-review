import { useEffect, useState } from 'react'

type LocalEmail = {
    id: string
    createdAt: string
    sourceEmail: string
    subject: string
    toAddresses: string[]
    ccAddresses: string[]
    bccAddresses: string[]
    replyToAddresses: string[]
    bodyText: string
    bodyHTML?: string
}

const API_BASE = '/emails'

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init)
    if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`)
    }
    return res.json() as Promise<T>
}

export function useInbox() {
    const [emails, setEmails] = useState<LocalEmail[]>([])
    const [connected, setConnected] = useState(false)

    useEffect(() => {
        fetchJson<LocalEmail[]>(API_BASE)
            .then((nextEmails) => {
                setEmails(nextEmails)
            })
            .catch((err) => {
                console.warn('Failed to fetch inbox:', err.message)
            })
    }, [])

    useEffect(() => {
        const es = new EventSource(`${API_BASE}/stream`)

        es.addEventListener('update', (e: MessageEvent) => {
            setEmails(JSON.parse(e.data) as LocalEmail[])
            setConnected(true)
        })

        es.onerror = () => setConnected(false)

        return () => es.close()
    }, [])

    const clearInbox = async () => {
        const nextEmails = await fetchJson<LocalEmail[]>(`${API_BASE}/reset`, {
            method: 'POST',
        })
        setEmails(nextEmails)
    }

    return { emails, connected, clearInbox }
}

export type { LocalEmail }
