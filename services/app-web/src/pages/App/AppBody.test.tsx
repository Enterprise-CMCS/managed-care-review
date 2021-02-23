import React from 'react'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/jestUtils'
import { AppBody } from './AppBody'

test('renders without errors', () => {
    renderWithProviders(<AppBody />, {
        authProvider: { localLogin: false },
    })
    const mainElement = screen.getByRole('main')
    expect(mainElement).toBeInTheDocument()
})
