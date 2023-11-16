import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers'
import { Breadcrumbs } from './Breadcrumbs'

describe('Breadcrumbs', () => {
    it('renders without errors', () => {
        const items = [
            { text: 'First link', link: '/firstlink' },
            { text: 'Second link', link: '/secondlink' },
        ]
        renderWithProviders(<Breadcrumbs items={items} />)
        expect(screen.getByText('First link')).toBeInTheDocument()
        expect(screen.getByText('Second link')).toBeInTheDocument()
    })

    it('renders items with links when expected', () => {
        const items = [
            { text: 'First link', link: '/firstlink' },
            { text: 'Second link', link: '/secondlink' },
            { text: 'Active link', link: '/thirdlink' },
        ]
        renderWithProviders(<Breadcrumbs items={items} />)
        expect(screen.getAllByRole('listitem')).toHaveLength(items.length)
        expect(screen.getAllByRole('link')).toHaveLength(items.length)
    })

    it('renders nothing if no items passed in', () => {
        renderWithProviders(
            <div data-testid="test1">
                <Breadcrumbs items={[]} />
            </div>
        )
        expect(screen.getByTestId('test1')).toBeEmptyDOMElement()
    })
})
