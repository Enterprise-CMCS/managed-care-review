import React from 'react'
import { Reports } from './Reports'
import { render, screen } from '@testing-library/react'

describe('Reports component', () => {
    it('renders the page with a link to download reports', () => {
        render(<Reports />)
        expect(screen).toMatchSnapshot()
    })
})
