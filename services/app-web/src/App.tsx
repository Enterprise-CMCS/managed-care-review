import React from 'react'
import { Header } from './components/Header/Header'
import './App.css'

function App(): React.ReactElement {
    return (
        <div className="App">
            <Header />
            <main>Main Content</main>
        </div>
    )
}

export default App
