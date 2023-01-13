import { render, screen } from '@testing-library/react'

import { DataDetailDateRange } from './DataDetailDateRange'

describe('DataDetailDateRange', () => {
    it('renders without errors', () => {
        render(
            <DataDetailDateRange
                startDate={new Date(Date.UTC(2022, 5, 21))}
                endDate={new Date(Date.UTC(2022, 5, 22))}
            />
        )
        expect(screen.getByText('06/21/2022 to 06/22/2022')).toBeInTheDocument()
    })

    it('renders missing field if one of the dates is missing', () => {
        render(
            <DataDetailDateRange startDate={undefined} endDate={undefined} />
        )
        expect(
            screen.getByText(/You must provide this information/)
        ).toBeInTheDocument()
    })
})
