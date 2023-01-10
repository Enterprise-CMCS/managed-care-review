import { render, screen } from '@testing-library/react'

import { DataDetailMissingField } from './DataDetailMissingField'

describe('DataDetailMissingField', () => {
    it('renders without errors', () => {
        render(<DataDetailMissingField />)
        expect(
            screen.getByText(/You must provide this information/)
        ).toBeInTheDocument()
    })
})
