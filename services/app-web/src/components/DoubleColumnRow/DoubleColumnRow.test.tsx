import { render, screen } from '@testing-library/react'

import { DoubleColumnRow } from './DoubleColumnRow'

describe('DoubleColumnRow', () => {
    it('renders without errors', () => {
        render(
            <DoubleColumnRow
                left="This shows up on the left"
                right="This shows up on the right"
            />
        )

        expect(
            screen.getByText('This shows up on the left')
        ).toBeInTheDocument()
        expect(
            screen.getByText('This shows up on the right')
        ).toBeInTheDocument()
    })
})
