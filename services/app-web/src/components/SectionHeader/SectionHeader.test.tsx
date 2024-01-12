import { SectionHeader } from './SectionHeader'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers/jestHelpers'

describe('SectionHeader', () => {
    it('renders without errors', () => {
        renderWithProviders(<SectionHeader header="This is a section" />)
        expect(
            screen.getByRole('heading', { name: 'This is a section' })
        ).toBeInTheDocument()
    })
    it('renders children', () => {
        renderWithProviders(
            <SectionHeader header="Page 1">
                <button>Click Me</button>
            </SectionHeader>
        )
        expect(
            screen.getByRole('heading', { name: 'Page 1' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Click Me' })
        ).toBeInTheDocument()
    })
    it('displays Edit link if editNavigateTo prop is passed in', () => {
        renderWithProviders(
            <SectionHeader header="Page 2" editNavigateTo="/some-edit-path">
                <button>Click Me</button>
            </SectionHeader>
        )
        expect(
            screen.getByRole('heading', { name: 'Page 2' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Click Me' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Edit Page 2' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Edit Page 2' })
        ).toHaveAttribute('href', '/some-edit-path')
    })
    it('respects the hideBorder prop', () => {
        renderWithProviders(
            <SectionHeader header="This is a section" hideBorder />
        )
        expect(
            screen
                .getByRole('heading', { name: 'This is a section' })
                .closest('div')
        ).not.toHaveClass('summarySectionHeaderBorder')
    })
})
