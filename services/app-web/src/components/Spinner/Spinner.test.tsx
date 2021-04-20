import { render, screen } from '@testing-library/react'

import { Spinner } from './Spinner'

describe('Spinner', () => {
    it('renders without errors', async () => {
        render(<Spinner />)

        expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
})
