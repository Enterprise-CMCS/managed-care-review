import { render } from '@testing-library/react'

import { Spinner } from './Spinner'

describe('Spinner', () => {
    it('renders without errors', async () => {
        const { getByTestId } = render(<Spinner />)
        expect(getByTestId('tabs')).toBeInTheDocument()
    })
})
