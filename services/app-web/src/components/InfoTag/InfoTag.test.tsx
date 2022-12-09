import { render, screen } from '@testing-library/react'

import { InfoTag } from './InfoTag'

describe('InfoTag', () => {
    it('renders without errors', async () => {
        render(<InfoTag color="blue">DRAFT</InfoTag>)

        expect(screen.getByText('DRAFT')).toBeInTheDocument()
    })
})
