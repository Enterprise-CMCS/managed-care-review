import React from 'react'
import { render, screen } from '@testing-library/react'
import App from './App'

test('renders without errors', () => {
    render(<App />)
    const headerElement = screen.getByRole('banner')
    const mainElement = screen.getByRole('main')

    expect(headerElement).toBeInTheDocument()
    expect(mainElement).toBeInTheDocument()
})
