import React from 'react'
import { Header } from './components/Header/Header'
import './App.css'
import { logEvent } from './log_event'

function App(): React.ReactElement {
    logEvent('on_load', { success: true })

    return (
        <div className="App">
            <Header stateCode="TN" />
            <main>Main Content</main>
        </div>
    )
}

export default App
