import React from 'react'

type StatusIndicatorProps = {
    connected: boolean
}

export function StatusIndicator({ connected }: StatusIndicatorProps) {
    const dotClass = connected
        ? 'status-dot status-dot--connected'
        : 'status-dot status-dot--disconnected'
    const text = connected ? 'Connected' : 'Disconnected - retrying...'

    return (
        <div className="status">
            <span className={dotClass} />
            <span>{text}</span>
        </div>
    )
}
