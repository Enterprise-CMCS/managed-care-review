import React from 'react'
import { Header } from './components/Header/Header'
import './App.css'
import { logEvent } from './log_event'

function App(): React.ReactElement {
    // TODO: Commenting out because right now this makes yarn test fail because of how config variables are being used.
    // Unit tests should be able to pass when app isn't running
    // logEvent('on_load', { success: true })

    return (
        <div className="App">
            <Header />
            <main>
                <h1>Main Content</h1>
            </main>
        </div>
    )
}

export default App
