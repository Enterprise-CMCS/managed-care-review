import React from 'react'
import { Header } from './components/Header/Header'
import './App.css'
import { logEvent } from './log_event'

function App(): React.ReactElement {
  
    logEvent('on_load', { success: true })

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
