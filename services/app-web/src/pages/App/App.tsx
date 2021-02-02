import React from 'react'
import { Header } from '../../components/Header/Header'
import './App.scss'
import { logEvent } from '../../log_event'

function App(): React.ReactElement {
    logEvent('on_load', { success: true })
    const mockUser = {
        name: 'Bob test user',
        email: 'bob@dmas.virginia.gov',
    }
    return (
        <div className="App">
            <Header user={mockUser} loggedIn stateCode="MN" />
            <main className="padding-x-4">Main Content</main>
        </div>
    )
}

export default App
