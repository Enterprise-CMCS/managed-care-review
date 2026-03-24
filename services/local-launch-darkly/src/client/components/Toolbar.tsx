import React from 'react'

type ToolbarProps = {
    onReset: () => void
    onEnableAll: () => void
    onDisableAll: () => void
}

export function Toolbar({ onReset, onEnableAll, onDisableAll }: ToolbarProps) {
    return (
        <div className="toolbar">
            <button className="button--danger" onClick={onReset}>
                Reset All to Defaults
            </button>
            <button onClick={onEnableAll}>Enable All</button>
            <button onClick={onDisableAll}>Disable All</button>
        </div>
    )
}
