import React from 'react'
import { CMSHeader } from './components/Header/Header'
import './App.css'

function App(): React.ReactElement {
    return (
        <div className="App">
            <CMSHeader />
            <main>Main Content</main>
        </div>
    )
}

export default App
