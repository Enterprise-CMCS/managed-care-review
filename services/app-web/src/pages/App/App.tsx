import React from 'react'
import { Header } from '../../components/Header/Header'
import './App.scss'
import { logEvent } from '../../log_event'

function App(): React.ReactElement {
    logEvent('on_load', { success: true })

    return (
        <div className="App">
            <Header stateCode="MN" />
            <main className="padding-x-4">Main Content</main>
        </div>
    )
}

export default App
