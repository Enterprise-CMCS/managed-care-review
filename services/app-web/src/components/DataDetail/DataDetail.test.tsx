import { render, screen } from '@testing-library/react'

import { DataDetail } from './DataDetail'

describe('DataDetail', () => {
    it('renders without errors', () => {
        render(
            <DataDetail
                id="rainfall"
                label="Average rainfall in May"
                children="31.58"
            />
        )
        expect(
            screen.getByRole('definition', {
                name: 'Average rainfall in May',
            })
        ).toBeInTheDocument()
        expect(screen.getByText('31.58')).toBeInTheDocument()
    })

    it('renders array of strings capitalized and comma separated to easily display program/rate names', () => {
        render(
            <DataDetail
                id="rainfall"
                label="Program names"
                children={['pmap-001', 'mcon-001']}
            />
        )
        expect(
            screen.getByRole('definition', {
                name: 'Program names',
            })
        ).toBeInTheDocument()
        expect(screen.getByText('PMAP-001, MCON-001')).toBeInTheDocument()
    })

    it('renders an address component when passed in', () => {
        render(
            <DataDetail id="disney" label="Disney World Contact Info">
                <address>
                    Mickey Mouse
                    <a href="mailto:mickey@disney.com">mickey@disney.com</a>
                    <a href="tel:555-555-5555">555-555-5555</a>
                </address>
            </DataDetail>
        )

        expect(
            screen.getByRole('definition', {
                name: 'Disney World Contact Info',
            })
        ).toBeInTheDocument()
        expect(screen.getByText('Mickey Mouse')).toBeInTheDocument()
        expect(screen.getAllByRole('link')).toHaveLength(2)
    })

    it('renders children when explainMissingData prop is true and valid children is passed in', () => {
        render(
            <DataDetail
                id="disney"
                label="Disney World's Best Attraction"
                explainMissingData={true}
            >
                The teacups
            </DataDetail>
        )
        expect(
            screen.queryByText(/You must provide this information/)
        ).toBeNull()
        expect(screen.getByText(/teacups/)).toBeInTheDocument()
    })

    describe('when children props are missing or empty', () => {
        it('renders nothing when explainMissingData prop is false', () => {
            const { container } = render(
                <DataDetail id="disney" label="Disney World Contact Info" />
            )

            expect(container).toBeEmptyDOMElement()
        })

        it('registers empty string as missing data (this would be returned by missing text input and radio fields)', () => {
            const { container } = render(
                <DataDetail
                    id="disney"
                    label="Disney World's Best Attraction"
                    children=""
                />
            )

            expect(container).toBeEmptyDOMElement()
        })

        it('registers empty array as missing data (this would be returned by missing checkbox fields)', () => {
            const { container } = render(
                <DataDetail
                    id="disney"
                    label="Disney World's Best Attraction"
                    children={[]}
                />
            )

            expect(container).toBeEmptyDOMElement()
        })

        it('renders definition label with helpful text when explainMissingData prop is true', () => {
            render(
                <DataDetail
                    id="disney"
                    label="Disney World's Best Attraction"
                    explainMissingData={true}
                >
                    {/* nothing here */}
                </DataDetail>
            )

            expect(
                screen.getByRole('definition', { name: /Disney/ })
            ).toBeInTheDocument()
            expect(
                screen.getByText(/You must provide this information/)
            ).toBeInTheDocument()
        })
    })
})
