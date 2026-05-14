import React, { useEffect, useState } from 'react'
import { useFlags } from './useFlags'
import { useInbox } from './useInbox'
import { StatusIndicator } from './components/StatusIndicator'
import { Toolbar } from './components/Toolbar'
import { FlagRow } from './components/FlagRow'
import { EmailInbox } from './components/EmailInbox'

type Tab = 'flags' | 'inbox'

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
        connected: flagsConnected,
        updateFlag,
        resetAll,
        enableAll,
        disableAll,
    } = useFlags()
    const {
        emails,
        connected: inboxConnected,
        clearInbox,
    } = useInbox()
    const [dark, toggleDark] = useDarkMode()
    const [activeTab, setActiveTab] = useState<Tab>('flags')

    return (
        <div className="page">
            <div className="header">
                <div>
                    <div className="eyebrow">MC-Review local environment</div>
                    <h1>Local Dev Console</h1>
                </div>
                <label
                    className="toggle dark-toggle"
                    title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
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
                Inspect local feature flags and captured emails in one place.
            </p>

            <div className="tab-bar">
                <button
                    className={`tab${activeTab === 'flags' ? ' tab--active' : ''}`}
                    onClick={() => setActiveTab('flags')}
                >
                    Feature Flags
                </button>
                <button
                    className={`tab${activeTab === 'inbox' ? ' tab--active' : ''}`}
                    onClick={() => setActiveTab('inbox')}
                >
                    Email Inbox
                </button>
            </div>

            {activeTab === 'flags' ? (
                <section className="panel">
                    <div className="panel__header">
                        <div>
                            <h2>Feature Flags</h2>
                            <p className="panel__subtitle">
                                Toggle local LaunchDarkly values for development.
                            </p>
                        </div>
                        <StatusIndicator
                            connected={flagsConnected}
                            label="Flag stream"
                        />
                    </div>
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
                </section>
            ) : (
                <section className="panel">
                    <div className="panel__header">
                        <div>
                            <h2>Email Inbox</h2>
                            <p className="panel__subtitle">
                                Rendered HTML emails sent by the local API.
                            </p>
                        </div>
                        <StatusIndicator
                            connected={inboxConnected}
                            label="Inbox stream"
                        />
                    </div>
                    <EmailInbox emails={emails} onClear={clearInbox} />
                </section>
            )}
        </div>
    )
}
