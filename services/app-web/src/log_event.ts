export function logEvent(name: string, data: Record<string, unknown>): void {
    const ev: Record<string, unknown> = Object.assign({}, data)
    ev['name'] = name
    ev['timestamp'] = new Date()

    const logEventURL = process.env.REACT_APP_API_URL + '/log_event'

    fetch(logEventURL, {
        method: 'POST',
        body: JSON.stringify(ev),
    })
}
