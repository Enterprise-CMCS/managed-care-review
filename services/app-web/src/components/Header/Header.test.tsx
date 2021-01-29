import React from 'react'
import { render } from '@testing-library/react'

import { Header } from './Header'

describe('Header', () => {
    it('renders without errors', async () => {
        const { container } = render(<Header />)
        expect(container).toHaveTextContent('About')
    })
})
