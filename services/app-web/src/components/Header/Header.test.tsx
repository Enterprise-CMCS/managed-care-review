import React from 'react'
import { render, screen } from '@testing-library/react'

import { Header } from './Header'

describe('Header', () => {
    it('should have no accessibility violations', async () => {
        const { container } = render(<Header />)
        expect(container).toHaveTextContent('Submission')
    })
})
