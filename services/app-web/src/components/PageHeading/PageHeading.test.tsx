import { render, screen } from '@testing-library/react'

import { PageHeading } from './PageHeading'

describe('Page Heading', () => {
    it('renders without errors', () => {
        render(<PageHeading>Test Heading</PageHeading>)
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
})
