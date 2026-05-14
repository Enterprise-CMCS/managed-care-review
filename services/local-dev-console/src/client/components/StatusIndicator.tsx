import React from 'react'

type StatusIndicatorProps = {
    connected: boolean
    label?: string
}

export function StatusIndicator({
    connected,
    label,
}: StatusIndicatorProps) {
    const dotClass = connected
        ? 'status-dot status-dot--connected'
        : 'status-dot status-dot--disconnected'
    const text = connected ? 'Connected' : 'Disconnected - retrying...'

    return (
        <div className="status">
            <span className={dotClass} />
            {label ? <span className="status-label">{label}</span> : null}
            <span>{text}</span>
        </div>
    )
}
