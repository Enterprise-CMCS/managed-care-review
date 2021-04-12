import React from 'react'
import { screen, render } from '@testing-library/react'
import { Loading } from './Loading'

describe('Loading component', () => {
    it('renders without errors', () => {
        render(<Loading />)
        expect(screen.getByText(/Loading/i)).toBeInTheDocument()
    })
})
