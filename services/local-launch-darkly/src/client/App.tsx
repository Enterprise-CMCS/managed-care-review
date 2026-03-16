import React, { useState, useEffect } from 'react'
import { useFlags } from './useFlags'
import { StatusIndicator } from './components/StatusIndicator'
import { Toolbar } from './components/Toolbar'
import { FlagRow } from './components/FlagRow'

function useDarkMode() {
    const [dark, setDark] = useState(() => {
        const saved = localStorage.getItem('ld-dark-mode')
        if (saved !== null) return saved === 'true'
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    })

    useEffect(() => {
        document.body.classList.toggle('dark', dark)
        localStorage.setItem('ld-dark-mode', String(dark))
    }, [dark])

    return [dark, () => setDark((d) => !d)] as const
}

export function App() {
    const {
        flags,
        defaults,
        connected,
        updateFlag,
        resetAll,
        enableAll,
        disableAll,
    } = useFlags()
    const [dark, toggleDark] = useDarkMode()

    return (
        <>
            <div className="header">
                <h1>MC-Review Local LaunchDarkly</h1>
                <label className="toggle dark-toggle" title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
                    <input
                        className="toggle__input"
                        type="checkbox"
                        checked={dark}
                        onChange={toggleDark}
                    />
                    <span className="toggle__slider" />
                </label>
            </div>
            <p className="subtitle">
                Toggle feature flags for local development
            </p>
            <StatusIndicator connected={connected} />
            <Toolbar
                onReset={resetAll}
                onEnableAll={enableAll}
                onDisableAll={disableAll}
            />
            <div className="flags">
                {Object.entries(flags).map(([key, value]) => (
                    <FlagRow
                        key={key}
                        flagKey={key}
                        value={value}
                        defaultValue={defaults[key]}
                        onUpdate={updateFlag}
                    />
                ))}
            </div>
        </>
    )
}
