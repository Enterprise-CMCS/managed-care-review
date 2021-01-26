import React from 'react'
import { render, screen } from '@testing-library/react'
const { axe, toHaveNoViolations } = require('jest-axe')

import { Header } from './Header'

expect.extend(toHaveNoViolations)

describe('Header', () => {
    it('should have no accessibility violations', async () => {
        const { container } = render(<Header />)

        const results = await axe(container)
        expect(results).toHaveNoViolations()
    })
})
